const { kv, K_POLL_VOTES, ensurePeriod, pollVoterKey, VOTER_TTL_SECONDS, zeroFillCounts } = require("./_store");

module.exports = async function handler(req, res){
  if (req.method !== "POST"){
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");

  try{
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { animalId, voterId } = body;

    const { period, pollOptions } = await ensurePeriod();
    if (!pollOptions.includes(animalId)){ res.status(400).json({ error: "animalId is not a current poll option" }); return; }
    if (typeof voterId !== "string" || voterId.length < 8 || voterId.length > 100){
      res.status(400).json({ error: "Invalid voterId" }); return;
    }

    const key = pollVoterKey(period, voterId);
    const already = await kv.get(key);
    if (!already){
      await kv.set(key, animalId, { ex: VOTER_TTL_SECONDS });
      await kv.hincrby(K_POLL_VOTES, animalId, 1);
    }

    const pollVotesMap = await kv.hgetall(K_POLL_VOTES);
    res.status(200).json({
      options: pollOptions,
      votes: zeroFillCounts(pollOptions, pollVotesMap || {}),
      myVote: already || animalId
    });
  } catch (err){
    console.error(err);
    res.status(500).json({ error: "Failed to record poll vote" });
  }
};
