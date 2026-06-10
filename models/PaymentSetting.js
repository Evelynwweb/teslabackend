const mongoose = require('mongoose');

const paymentSettingSchema = new mongoose.Schema({
  depositAddresses: {
    type: Map,
    of: new mongoose.Schema({
      address: { type: String, required: true },
      network: { type: String, default: '' }
    }, { _id: false }),
    default: {}
  },
  withdrawalFeePercent: { type: Number, default: 10, min: 0, max: 100 },
  
  methodDetails: {
    type: Map,
    of: new mongoose.Schema({
      name: { type: String, required: true },
      icon: { type: String, default: '' },
      type: { type: String, enum: ['deposit', 'withdrawal', 'both'], default: 'deposit' },
      withdrawalFields: {   // NEW: fields to show on withdrawal form
        type: [new mongoose.Schema({
          label: { type: String, required: true },
          name: { type: String, required: true },
          type: { type: String, default: 'text' }, // text, textarea, email
          placeholder: { type: String, default: '' },
          required: { type: Boolean, default: true }
        }, { _id: false })],
        default: []
      }
    }, { _id: false }),
    default: {}
  }
}, { timestamps: true });

paymentSettingSchema.statics.getSettings = async function() {
  let settings = await this.findOne({});
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('PaymentSetting', paymentSettingSchema);