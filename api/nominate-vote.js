const { kv, K_NOMINATIONS, K_NOMINATION_VOTES, nominationVoterKey } = require("./_store");

module.exports = async function handler(req, res){
  if (req.method !== "POST"){
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");

  try{
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { nominationId, voterId } = body;

    if (typeof nominationId !== "string" || !nominationId){ res.status(400).json({ error: "Invalid nominationId" }); return; }
    if (typeof voterId !== "string" || voterId.length < 8 || voterId.length > 100){
      res.status(400).json({ error: "Invalid voterId" }); return;
    }

    const exists = await kv.hget(K_NOMINATIONS, nominationId);
    if (!exists){ res.status(404).json({ error: "Suggestion not found" }); return; }

    const key = nominationVoterKey(nominationId, voterId);
    const already = await kv.get(key);
    if (!already){
      await kv.set(key, "1");
      await kv.hincrby(K_NOMINATION_VOTES, nominationId, 1);
    }

    const support = await kv.hget(K_NOMINATION_VOTES, nominationId);
    res.status(200).json({ nominationId, support: Number(support) || 0, myVote: true });
  } catch (err){
    console.error(err);
    res.status(500).json({ error: "Failed to record support" });
  }
};
