const PaymentSetting = require('../models/PaymentSetting');

exports.getPaymentSettings = async (req, res) => {
  try {
    const settings = await PaymentSetting.getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updatePaymentSettings = async (req, res) => {
  try {
    const settings = await PaymentSetting.getSettings();
    const { depositAddresses, withdrawalFeePercent, methodDetails } = req.body;
    
    if (depositAddresses !== undefined) {
      for (let [methodId, data] of Object.entries(depositAddresses)) {
        settings.depositAddresses.set(methodId, {
          address: data.address,
          network: data.network || ''
        });
      }
    }
    
    if (withdrawalFeePercent !== undefined) {
      settings.withdrawalFeePercent = withdrawalFeePercent;
    }
    
    if (methodDetails !== undefined) {
      for (let [methodId, details] of Object.entries(methodDetails)) {
        settings.methodDetails.set(methodId, {
          name: details.name,
          icon: details.icon || '',
          type: details.type || 'deposit'
        });
      }
    }
    
    
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};