const { ANIMAL_IDS } = require("./_animals");
const { kv, K_VOTES_UP, K_VOTES_DOWN, K_POLL_VOTES, K_H2H_WINS, K_H2H_LOSSES, VOTE_LIMIT, zeroFillCounts, ensurePeriod, voterVotesKey, pollVoterKey } = require("./_store");

module.exports = async function handler(req, res){
  if (req.method !== "GET"){
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");

  try{
    const { period, rankOrder, pollOptions } = await ensurePeriod();

    const [upMap, downMap, pollVotesMap, h2hWinsMap, h2hLossesMap] = await Promise.all([
      kv.hgetall(K_VOTES_UP),
      kv.hgetall(K_VOTES_DOWN),
      kv.hgetall(K_POLL_VOTES),
      kv.hgetall(K_H2H_WINS),
      kv.hgetall(K_H2H_LOSSES)
    ]);

    const upvotes = zeroFillCounts(ANIMAL_IDS, upMap || {});
    const downvotes = zeroFillCounts(ANIMAL_IDS, downMap || {});
    const pollVotes = zeroFillCounts(pollOptions, pollVotesMap || {});
    const h2hWins = zeroFillCounts(ANIMAL_IDS, h2hWinsMap || {});
    const h2hLosses = zeroFillCounts(ANIMAL_IDS, h2hLossesMap || {});

    const voterId = typeof req.query.voterId === "string" ? req.query.voterId.slice(0, 100) : null;
    let myVotes = {};
    let myPollVote = null;
    if (voterId){
      const [voterHash, pollVoter] = await Promise.all([
        kv.hgetall(voterVotesKey(period, voterId)),
        kv.get(pollVoterKey(period, voterId))
      ]);
      myVotes = voterHash || {};
      myPollVote = pollVoter || null;
    }

    res.status(200).json({
      period,
      rankOrder,
      votes: ANIMAL_IDS.reduce((acc, id) => {
        acc[id] = { upvotes: upvotes[id], downvotes: downvotes[id] };
        return acc;
      }, {}),
      poll: { options: pollOptions, votes: pollVotes, myVote: myPollVote },
      h2h: ANIMAL_IDS.reduce((acc, id) => {
        acc[id] = { wins: h2hWins[id], losses: h2hLosses[id] };
        return acc;
      }, {}),
      myVotes,
      voteLimit: VOTE_LIMIT
    });
  } catch (err){
    console.error(err);
    res.status(500).json({ error: "Failed to load state" });
  }
};
