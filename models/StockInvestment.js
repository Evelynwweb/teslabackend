const mongoose = require('mongoose');

const stockInvestmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stockId: { type: Number, required: true },
  stockName: { type: String, required: true },
  symbol: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  duration: { type: String, required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  profit: { type: Number, default: 0 }
});

module.exports = mongoose.model('StockInvestment', stockInvestmentSchema);