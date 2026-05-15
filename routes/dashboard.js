const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Deposit = require('../models/Deposit');
const User = require('../models/User');

// GET /api/dashboard - returns user data + recent transactions + referral stats
router.get('/dashboard', protect, async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  
  // Get recent transactions (deposits, withdrawals, etc.)
  const transactions = await Transaction.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(10);
  
  // Count total referrals (users who used this user's username as ref_by)
  const totalReferrals = await User.countDocuments({ ref_by: user.username });
  
  // Referral earnings (bonus from referrals)
  const referralEarnings = user.bonus;
  
  res.json({
    user: {
      username: user.username,
      name: user.name,
      email: user.email,
      balance: user.balance,
      bonus: user.bonus,
      profit: user.profit,
      totalDeposited: user.totalDeposited,
      totalWithdrawn: user.totalWithdrawn,
      emailVerified: user.emailVerified || false,
      createdAt: user.createdAt
    },
    stats: {
      totalReferrals,
      referralEarnings
    },
    recentTransactions: transactions.map(t => ({
      amount: t.amount,
      type: t.type,
      status: t.status,
      date: t.createdAt,
      description: t.description
    }))
  });
});

module.exports = router;