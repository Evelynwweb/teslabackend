const mongoose = require('mongoose');

const userInvestmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  planName: { type: String, required: true },
  amount: { type: Number, required: true },
  roiPercentage: { type: Number, required: true },
  duration: { type: String, required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  totalReturns: { type: Number, default: 0 }
});

module.exports = mongoose.model('UserInvestment', userInvestmentSchema);