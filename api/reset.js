// Triggered by Vercel Cron every Monday at 9:00 AM UTC (see vercel.json).
// This is a backup trigger — /api/state and /api/vote already perform the
// same rollover lazily the moment anyone hits the site after the boundary
// passes, so the site stays correct even if a cron run is ever missed.
const { ensurePeriod } = require("./_store");

module.exports = async function handler(req, res){
  const secret = process.env.CRON_SECRET;
  if (secret){
    const auth = req.headers["authorization"];
    if (auth !== `Bearer ${secret}`){
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }
  try{
    const result = await ensurePeriod();
    res.status(200).json({ ok: true, ...result });
  } catch (err){
    console.error(err);
    res.status(500).json({ error: "Reset failed" });
  }
};
