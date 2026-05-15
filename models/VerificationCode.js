const mongoose = require('mongoose');

const verificationCodeSchema = new mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 } // auto delete after 10 min
});

module.exports = mongoose.model('VerificationCode', verificationCodeSchema);