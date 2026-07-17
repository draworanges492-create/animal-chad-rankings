const { kv } = require("@vercel/kv");
const { ANIMAL_IDS, baselineOrder } = require("./_animals");
const { currentPeriodStartISO } = require("./_period");

const K_PERIOD = "chad:period";
const K_RANKORDER = "chad:rankOrder";
const K_VOTES_UP = "chad:votes:up";
const K_VOTES_DOWN = "chad:votes:down";
const K_POLL_OPTIONS = "chad:pollOptions";
const K_POLL_VOTES = "chad:pollVotes";
const VOTER_TTL_SECONDS = 9 * 24 * 60 * 60; // 9 days, one day past the weekly boundary

function voterVotesKey(period, voterId){ return `chad:voterVotes:${period}:${voterId}`; }
function pollVoterKey(period, voterId){ return `chad:pollVoter:${period}:${voterId}`; }

function pickPollOptions(){
  const shuffled = ANIMAL_IDS.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 4);
}

function zeroFillCounts(ids, hash){
  const out = {};
  ids.forEach(id => { out[id] = Number((hash && hash[id]) || 0); });
  return out;
}

function netVotes(upMap, downMap, id){
  return (Number(upMap[id]) || 0) - (Number(downMap[id]) || 0);
}

async function freezeFinalOrder(){
  const [upMap, downMap] = await Promise.all([
    kv.hgetall(K_VOTES_UP),
    kv.hgetall(K_VOTES_DOWN)
  ]);
  const up = zeroFillCounts(ANIMAL_IDS, upMap || {});
  const down = zeroFillCounts(ANIMAL_IDS, downMap || {});
  const { ANIMAL_BY_ID } = require("./_animals");
  return ANIMAL_IDS.slice().sort((a, b) => {
    const diff = netVotes(up, down, b) - netVotes(up, down, a);
    if (diff !== 0) return diff;
    const scoreDiff = ANIMAL_BY_ID[b].chadScore - ANIMAL_BY_ID[a].chadScore;
    if (scoreDiff !== 0) return scoreDiff;
    return ANIMAL_BY_ID[a].name.localeCompare(ANIMAL_BY_ID[b].name);
  });
}

// Ensures the stored period/rankOrder/poll reflect the current week.
// If the stored period is stale (or missing), performs the weekly
// rollover: freezes a new rank order from the votes that just finished
// accumulating, zeroes the tallies, and rolls a fresh 3-animal poll.
// A short lock prevents two simultaneous requests from double-resetting.
async function ensurePeriod(){
  const currentPeriod = currentPeriodStartISO();
  const storedPeriod = await kv.get(K_PERIOD);

  if (storedPeriod && storedPeriod >= currentPeriod){
    let rankOrder = await kv.get(K_RANKORDER);
    let pollOptions = await kv.get(K_POLL_OPTIONS);
    if (!rankOrder || rankOrder.length !== ANIMAL_IDS.length){ rankOrder = baselineOrder(); }
    if (!pollOptions || pollOptions.length !== 4){ pollOptions = pickPollOptions(); await kv.set(K_POLL_OPTIONS, pollOptions); }
    return { period: storedPeriod, rankOrder, pollOptions };
  }

  const gotLock = await kv.set("chad:resetLock", "1", { nx: true, ex: 30 });
  if (!gotLock){
    // another request is mid-reset; give it a moment then read whatever it produced
    await new Promise(r => setTimeout(r, 400));
    const rankOrder = (await kv.get(K_RANKORDER)) || baselineOrder();
    const pollOptions = (await kv.get(K_POLL_OPTIONS)) || pickPollOptions();
    const period = (await kv.get(K_PERIOD)) || currentPeriod;
    return { period, rankOrder, pollOptions };
  }

  let rankOrder;
  if (!storedPeriod){
    rankOrder = baselineOrder();
  } else {
    rankOrder = await freezeFinalOrder();
    await Promise.all([kv.del(K_VOTES_UP), kv.del(K_VOTES_DOWN), kv.del(K_POLL_VOTES)]);
  }
  const pollOptions = pickPollOptions();

  await Promise.all([
    kv.set(K_RANKORDER, rankOrder),
    kv.set(K_POLL_OPTIONS, pollOptions),
    kv.set(K_PERIOD, currentPeriod)
  ]);

  return { period: currentPeriod, rankOrder, pollOptions };
}

module.exports = {
  kv,
  K_PERIOD, K_RANKORDER, K_VOTES_UP, K_VOTES_DOWN, K_POLL_OPTIONS, K_POLL_VOTES,
  VOTER_TTL_SECONDS,
  voterVotesKey, pollVoterKey,
  zeroFillCounts,
  ensurePeriod
};
