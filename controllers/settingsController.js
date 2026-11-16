const PaymentSetting = require('../models/PaymentSetting');
const { clearSettingsCache, pickGeneral } = require('../utils/siteSettings');

exports.getPaymentSettings = async (req, res) => {
  try {
    const settings = await PaymentSetting.getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// The admin UI always sends the complete maps, so they replace what is stored.
// (Merging used to keep deleted methods forever and dropped withdrawalFields.)
exports.updatePaymentSettings = async (req, res) => {
  try {
    const settings = await PaymentSetting.getSettings();
    const { depositAddresses, withdrawalFeePercent, methodDetails } = req.body;

    if (depositAddresses !== undefined) {
      const next = new Map();
      for (const [methodId, data] of Object.entries(depositAddresses || {})) {
        if (!data || !data.address) continue;
        next.set(methodId, { address: data.address, network: data.network || '' });
      }
      settings.depositAddresses = next;
    }

    if (withdrawalFeePercent !== undefined) {
      const fee = Number(withdrawalFeePercent);
      if (!Number.isFinite(fee) || fee < 0 || fee > 100) {
        return res.status(400).json({ message: 'Withdrawal fee must be between 0 and 100' });
      }
      settings.withdrawalFeePercent = fee;
    }

    if (methodDetails !== undefined) {
      const next = new Map();
      for (const [methodId, details] of Object.entries(methodDetails || {})) {
        if (!details || !details.name) continue;
        next.set(methodId, {
          name: details.name,
          icon: details.icon || '',
          type: details.type || 'deposit',
          withdrawalFields: Array.isArray(details.withdrawalFields)
            ? details.withdrawalFields
                .filter((f) => f && f.label && f.name)
                .map((f) => ({
                  label: f.label,
                  name: f.name,
                  type: f.type || 'text',
                  placeholder: f.placeholder || '',
                  required: f.required !== false,
                }))
            : [],
        });
      }
      settings.methodDetails = next;
    }

    await settings.save();
    clearSettingsCache();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/settings
exports.getGeneralSettings = async (req, res) => {
  try {
    const settings = await PaymentSetting.getSettings();
    res.json(pickGeneral(settings));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/admin/settings
exports.updateGeneralSettings = async (req, res) => {
  try {
    const settings = await PaymentSetting.getSettings();
    const b = req.body || {};

    if (b.siteName !== undefined) settings.siteName = String(b.siteName).trim() || 'Tesla Dashboard';
    if (b.supportEmail !== undefined) settings.supportEmail = String(b.supportEmail).trim();

    for (const key of ['withdrawalFeePercent', 'minWithdrawal', 'maxWithdrawal']) {
      if (b[key] === undefined) continue;
      const n = Number(b[key]);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ message: `${key} must be a positive number` });
      }
      settings[key] = n;
    }
    if (settings.withdrawalFeePercent > 100) {
      return res.status(400).json({ message: 'Withdrawal fee cannot exceed 100%' });
    }
    if (settings.maxWithdrawal && settings.minWithdrawal > settings.maxWithdrawal) {
      return res.status(400).json({ message: 'Minimum withdrawal cannot exceed the maximum' });
    }

    if (b.maintenance !== undefined) settings.maintenance = Boolean(b.maintenance);
    if (b.registrationEnabled !== undefined) settings.registrationEnabled = Boolean(b.registrationEnabled);

    await settings.save();
    clearSettingsCache();
    res.json(pickGeneral(settings));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
