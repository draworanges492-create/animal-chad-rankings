const { kv, K_NOMINATIONS, K_NOMINATION_VOTES, nominationVoterKey } = require("./_store");

module.exports = async function handler(req, res){
  if (req.method !== "GET"){
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");

  try{
    const [nomMap, votesMap] = await Promise.all([
      kv.hgetall(K_NOMINATIONS),
      kv.hgetall(K_NOMINATION_VOTES)
    ]);

    const ids = Object.keys(nomMap || {});
    const voterId = typeof req.query.voterId === "string" ? req.query.voterId.slice(0, 100) : null;

    let myVotedIds = [];
    if (voterId && ids.length){
      const checks = await Promise.all(ids.map(id => kv.get(nominationVoterKey(id, voterId))));
      myVotedIds = ids.filter((id, i) => !!checks[i]);
    }
    const myVotedSet = new Set(myVotedIds);

    const nominations = ids.map(id => {
      let parsed;
      try{ parsed = JSON.parse(nomMap[id]); } catch(e){ parsed = null; }
      if (!parsed) return null;
      return {
        id,
        name: parsed.name,
        reason: parsed.reason,
        submittedAt: parsed.submittedAt,
        support: Number((votesMap && votesMap[id]) || 0),
        myVote: myVotedSet.has(id)
      };
    }).filter(Boolean).sort((a, b) => b.support - a.support || new Date(b.submittedAt) - new Date(a.submittedAt));

    res.status(200).json({ nominations });
  } catch (err){
    console.error(err);
    res.status(500).json({ error: "Failed to load suggestions" });
  }
};
