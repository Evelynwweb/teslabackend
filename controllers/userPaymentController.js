const PaymentSetting = require('../models/PaymentSetting');

exports.getDepositMethods = async (req, res) => {
  try {
    const settings = await PaymentSetting.getSettings();
    const methods = [];
    for (let [methodId, addressData] of settings.depositAddresses) {
      const details = settings.methodDetails.get(methodId);
      if (details && (details.type === 'deposit' || details.type === 'both')) {
        methods.push({
          id: methodId,
          name: details.name,
          icon: details.icon || '',
          address: addressData.address,
          network: addressData.network
        });
      }
    }
    res.json(methods);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getWithdrawalMethods = async (req, res) => {
  try {
    const settings = await PaymentSetting.getSettings();
    const methods = [];
    for (let [methodId, details] of settings.methodDetails) {
      if (details.type === 'withdrawal' || details.type === 'both') {
        methods.push({
          id: methodId,
          name: details.name,
          icon: details.icon || '',
          withdrawalFields: details.withdrawalFields || []  // <-- include fields
        });
      }
    }
    res.json(methods);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};