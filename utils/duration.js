// "30 Days", "2 weeks", "6 Months", "1 Year" -> number of days (null if unrecognised)
const UNIT_DAYS = { day: 1, week: 7, month: 30, year: 365 };

function durationToDays(text) {
  const m = String(text || '').trim().match(/^(\d+)\s*(day|week|month|year)s?$/i);
  if (!m) return null;
  return Number(m[1]) * UNIT_DAYS[m[2].toLowerCase()];
}

module.exports = { durationToDays };
