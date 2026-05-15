const mongoose = require('mongoose');

const tradingHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  investmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserInvestment' },
  amount: { type: Number, required: true }, // profit amount (positive)
  type: { type: String, default: 'ROI' },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TradingHistory', tradingHistorySchema);