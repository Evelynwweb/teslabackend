const mongoose = require('mongoose');

const botPurchaseSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  botId: { type: Number, required: true },      // matches id from tradingBots array
  botName: { type: String, required: true },    // e.g., "Weekly Trading Bot"
  amount: { type: Number, required: true, min: 0 },
  duration: { type: String, required: true },   // e.g., "7 days"
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
  totalReturns: { type: Number, default: 0 }
});

module.exports = mongoose.model('BotPurchase', botPurchaseSchema);