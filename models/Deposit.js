const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, min: 50 },
  paymentMethod: { type: String, required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  // Payment proof is stored in the database: serverless hosts (Vercel) have
  // no writable disk, so files saved to ./uploads were lost or failed.
  // `select: false` keeps the binary out of list queries.
  proof: {
    data: { type: Buffer, select: false },
    contentType: { type: String },
    filename: { type: String },
  },
  // The pending Transaction created with the deposit, updated on approve/reject
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Deposit', depositSchema);
