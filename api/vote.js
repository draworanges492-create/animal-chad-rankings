const { ANIMAL_IDS } = require("./_animals");
const { kv, K_VOTES_UP, K_VOTES_DOWN, ensurePeriod, voterVotesKey, VOTER_TTL_SECONDS } = require("./_store");

module.exports = async function handler(req, res){
  if (req.method !== "POST"){
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");

  try{
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { animalId, dir, voterId } = body;

    if (!ANIMAL_IDS.includes(animalId)){ res.status(400).json({ error: "Unknown animalId" }); return; }
    if (dir !== "up" && dir !== "down"){ res.status(400).json({ error: "dir must be up or down" }); return; }
    if (typeof voterId !== "string" || voterId.length < 8 || voterId.length > 100){
      res.status(400).json({ error: "Invalid voterId" }); return;
    }

    const { period } = await ensurePeriod();
    const hashKey = voterVotesKey(period, voterId);
    const existing = await kv.hget(hashKey, animalId); // "up" | "down" | null

    let newState = dir;
    if (existing === dir){
      // toggling the same direction off
      await kv.hdel(hashKey, animalId);
      await kv.hincrby(dir === "up" ? K_VOTES_UP : K_VOTES_DOWN, animalId, -1);
      newState = null;
    } else if (existing){
      // switching from the opposite direction
      await kv.hset(hashKey, { [animalId]: dir });
      await kv.hincrby(existing === "up" ? K_VOTES_UP : K_VOTES_DOWN, animalId, -1);
      await kv.hincrby(dir === "up" ? K_VOTES_UP : K_VOTES_DOWN, animalId, 1);
    } else {
      // first vote from this voter for this animal
      await kv.hset(hashKey, { [animalId]: dir });
      await kv.hincrby(dir === "up" ? K_VOTES_UP : K_VOTES_DOWN, animalId, 1);
    }
    await kv.expire(hashKey, VOTER_TTL_SECONDS);

    const [upvotes, downvotes] = await Promise.all([
      kv.hget(K_VOTES_UP, animalId),
      kv.hget(K_VOTES_DOWN, animalId)
    ]);

    res.status(200).json({
      animalId,
      upvotes: Math.max(0, Number(upvotes) || 0),
      downvotes: Math.max(0, Number(downvotes) || 0),
      myVote: newState
    });
  } catch (err){
    console.error(err);
    res.status(500).json({ error: "Failed to record vote" });
  }
};
