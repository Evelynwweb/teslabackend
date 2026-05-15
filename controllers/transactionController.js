const Deposit = require('../models/Deposit');
const Withdrawal = require('../models/Withdrawal');
const Transaction = require('../models/Transaction');

// Deposits only
exports.getDeposits = async (req, res) => {
  const deposits = await Deposit.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(deposits);
};

// Withdrawals only
exports.getWithdrawals = async (req, res) => {
  const withdrawals = await Withdrawal.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(withdrawals);
};

// Others (bonus, referral, etc.) from Transaction model
exports.getOthers = async (req, res) => {
  const others = await Transaction.find({
    user: req.user._id,
    type: { $in: ['bonus', 'referral'] }
  }).sort({ createdAt: -1 });
  res.json(others);
};