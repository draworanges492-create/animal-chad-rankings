const { kv, K_NOMINATIONS, ensurePeriod, nominationSubmitCountKey } = require("./_store");

const MAX_NAME_LEN = 60;
const MAX_REASON_LEN = 300;
const MAX_SUBMITS_PER_VOTER_PER_WEEK = 3;
const MAX_TOTAL_PENDING = 200;
const SUBMIT_COUNT_TTL_SECONDS = 9 * 24 * 60 * 60;

function stripTags(s){
  return String(s).replace(/<[^>]*>/g, "").trim();
}

module.exports = async function handler(req, res){
  if (req.method !== "POST"){
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");

  try{
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const rawName = typeof body.name === "string" ? body.name : "";
    const rawReason = typeof body.reason === "string" ? body.reason : "";
    const { voterId } = body;

    const name = stripTags(rawName).slice(0, MAX_NAME_LEN);
    const reason = stripTags(rawReason).slice(0, MAX_REASON_LEN);

    if (name.length < 2){ res.status(400).json({ error: "Animal name is too short" }); return; }
    if (typeof voterId !== "string" || voterId.length < 8 || voterId.length > 100){
      res.status(400).json({ error: "Invalid voterId" }); return;
    }

    const { period } = await ensurePeriod();

    const submitKey = nominationSubmitCountKey(period, voterId);
    const submitCount = await kv.incr(submitKey);
    if (submitCount === 1){ await kv.expire(submitKey, SUBMIT_COUNT_TTL_SECONDS); }
    if (submitCount > MAX_SUBMITS_PER_VOTER_PER_WEEK){
      res.status(429).json({ error: `You can suggest up to ${MAX_SUBMITS_PER_VOTER_PER_WEEK} animals per week` });
      return;
    }

    const total = await kv.hlen(K_NOMINATIONS);
    if (total >= MAX_TOTAL_PENDING){
      res.status(429).json({ error: "The suggestion queue is full right now — check back later" });
      return;
    }

    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const record = { id, name, reason, submittedAt: new Date().toISOString() };
    await kv.hset(K_NOMINATIONS, { [id]: JSON.stringify(record) });

    res.status(200).json({ ok: true, nomination: record });
  } catch (err){
    console.error(err);
    res.status(500).json({ error: "Failed to submit suggestion" });
  }
};
