// The site's "week" runs Monday 9:00 AM UTC to the next Monday 9:00 AM UTC.
// This is computed server-side so every visitor, everywhere, agrees on the
// same boundary (the old client-only version used each visitor's local
// clock, which meant the "week" was different per browser).
function getMostRecentMondayUTC(from){
  const d = new Date(from);
  const day = d.getUTCDay(); // 0 = Sunday
  let diff = (day + 6) % 7; // days since most recent Monday
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 9, 0, 0, 0));
  monday.setUTCDate(monday.getUTCDate() - diff);
  if (monday.getTime() > d.getTime()){ monday.setUTCDate(monday.getUTCDate() - 7); }
  return monday;
}

function currentPeriodStartISO(now){
  return getMostRecentMondayUTC(now || new Date()).toISOString();
}

module.exports = { getMostRecentMondayUTC, currentPeriodStartISO };
