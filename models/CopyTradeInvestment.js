const mongoose = require('mongoose');

const copyTradeInvestmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  traderId: { type: Number, required: true },
  traderName: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  duration: { type: String, required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  profit: { type: Number, default: 0 }
});

module.exports = mongoose.model('CopyTradeInvestment', copyTradeInvestmentSchema);