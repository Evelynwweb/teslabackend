const PaymentSetting = require('../models/PaymentSetting');

// Settings are read on many requests (maintenance check, config, withdrawals),
// so keep a short in-memory copy. Saving through the admin API clears it.
const TTL_MS = 30 * 1000;
let cache = null;
let cachedAt = 0;

const GENERAL_FIELDS = [
  'siteName',
  'supportEmail',
  'withdrawalFeePercent',
  'minWithdrawal',
  'maxWithdrawal',
  'maintenance',
  'registrationEnabled',
];

const pickGeneral = (doc) => {
  const out = {};
  for (const key of GENERAL_FIELDS) out[key] = doc[key];
  return out;
};

async function getGeneralSettings({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cachedAt < TTL_MS) return cache;
  const doc = await PaymentSetting.getSettings();
  cache = pickGeneral(doc);
  cachedAt = Date.now();
  return cache;
}

function clearSettingsCache() {
  cache = null;
}

module.exports = { getGeneralSettings, clearSettingsCache, pickGeneral, GENERAL_FIELDS };
