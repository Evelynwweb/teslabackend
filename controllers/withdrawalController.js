const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const Transaction = require('../models/Transaction');

exports.confirmPassword = async (req, res) => {
  const { password } = req.body;
  const user = await User.findById(req.user._id);
  const isMatch = await user.matchPassword(password);
  if (!isMatch) return res.status(401).json({ message: 'Incorrect password' });
  res.json({ success: true });
};

exports.createWithdrawal = async (req, res) => {
  const { amount, method } = req.body;
  const user = req.user;

  if (amount < 10) return res.status(400).json({ message: 'Minimum $10' });
  if (user.balance < amount) return res.status(400).json({ message: 'Insufficient balance' });

  user.balance -= amount;
  await user.save();

  const withdrawal = await Withdrawal.create({
    user: user._id,
    amount,
    method,
    status: 'pending'
  });

  await Transaction.create({
    user: user._id,
    amount: -amount,
    type: 'withdrawal',
    status: 'pending',
    description: `Withdrawal via ${method}`
  });

  res.status(201).json({ message: 'Withdrawal request submitted' });
};