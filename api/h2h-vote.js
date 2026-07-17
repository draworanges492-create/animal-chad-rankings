const { ANIMAL_IDS } = require("./_animals");
const { kv, K_H2H_WINS, K_H2H_LOSSES, ensurePeriod, h2hVoterCountKey } = require("./_store");

// Generous per-voter cap on matchup rounds per week — this isn't meant to
// throttle normal play (matchups are designed to be played many times),
// just to blunt scripted abuse.
const H2H_VOTER_LIMIT = 500;
const H2H_VOTER_TTL_SECONDS = 9 * 24 * 60 * 60;

module.exports = async function handler(req, res){
  if (req.method !== "POST"){
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");

  try{
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { winnerId, loserId, voterId } = body;

    if (!ANIMAL_IDS.includes(winnerId) || !ANIMAL_IDS.includes(loserId)){
      res.status(400).json({ error: "Unknown animalId" }); return;
    }
    if (winnerId === loserId){ res.status(400).json({ error: "winnerId and loserId must differ" }); return; }
    if (typeof voterId !== "string" || voterId.length < 8 || voterId.length > 100){
      res.status(400).json({ error: "Invalid voterId" }); return;
    }

    const { period } = await ensurePeriod();
    const countKey = h2hVoterCountKey(period, voterId);
    const count = await kv.incr(countKey);
    if (count === 1){ await kv.expire(countKey, H2H_VOTER_TTL_SECONDS); }
    if (count > H2H_VOTER_LIMIT){
      res.status(429).json({ error: "Matchup vote limit reached for this week" });
      return;
    }

    await Promise.all([
      kv.hincrby(K_H2H_WINS, winnerId, 1),
      kv.hincrby(K_H2H_LOSSES, loserId, 1)
    ]);

    const [winnerWins, winnerLosses, loserWins, loserLosses] = await Promise.all([
      kv.hget(K_H2H_WINS, winnerId),
      kv.hget(K_H2H_LOSSES, winnerId),
      kv.hget(K_H2H_WINS, loserId),
      kv.hget(K_H2H_LOSSES, loserId)
    ]);

    res.status(200).json({
      winnerId,
      loserId,
      h2h: {
        [winnerId]: { wins: Number(winnerWins) || 0, losses: Number(winnerLosses) || 0 },
        [loserId]: { wins: Number(loserWins) || 0, losses: Number(loserLosses) || 0 }
      }
    });
  } catch (err){
    console.error(err);
    res.status(500).json({ error: "Failed to record matchup vote" });
  }
};
