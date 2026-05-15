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

// controllers/withdrawalController.js
exports.createWithdrawal = async (req, res) => {
  try {
    const { amount, method, details, wcCode } = req.body;
    const user = req.user;

    if (!amount || amount < 10) {
      return res.status(400).json({ message: 'Minimum withdrawal is $10' });
    }
    if (user.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Create withdrawal request without touching balance
    const withdrawal = await Withdrawal.create({
      user: user._id,
      amount,
      method,
      details: details || '',
      wcCode: wcCode || '',
      status: 'pending'
    });

    // Log a pending transaction (optional)
    await Transaction.create({
      user: user._id,
      amount: -amount,
      type: 'withdrawal',
      status: 'pending',
      description: `Withdrawal via ${method}`
    });

    res.status(201).json({ message: 'Withdrawal request submitted', withdrawalId: withdrawal._id });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};