const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Deposit = require('../models/Deposit');
const User = require('../models/User');
const { processUserProfits } = require('../services/profitService');

// GET /api/dashboard - returns user data + recent transactions + referral stats
router.get('/dashboard', protect, async (req, res) => {
  try {
    // ── Lazy profit catch-up ─────────────────────────────────
    // CAS-guarded inside the service, so this is safe to call on
    // every request. Credits any days owed since the last cron run.
    try {
      await processUserProfits(req.user._id);
    } catch (e) {
      // Never fail the dashboard because of a profit payout issue
      console.error('processUserProfits failed:', e.message);
    }

    // Load user AFTER profit run so balance/profit are fresh
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

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
        createdAt: user.createdAt,
      },
      stats: {
        totalReferrals,
        referralEarnings,
      },
      recentTransactions: transactions.map((t) => ({
        amount: t.amount,
        type: t.type,
        status: t.status,
        date: t.createdAt,
        description: t.description,
      })),
    });
  } catch (err) {
    console.error('dashboard error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;