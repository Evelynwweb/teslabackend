const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 0 },
  fee: { type: Number, default: 0 },
  // Amount taken from the user's balance when the request was made
  // (amount + fee). Refunded on rejection. 0 on requests made before holds existed.
  held: { type: Number, default: 0 },
  method: { type: String, required: true },
  details: { type: String, default: '' },   // wallet address, bank info, etc.
  wcCode: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  createdAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
