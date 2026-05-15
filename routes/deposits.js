const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Deposit = require('../models/Deposit');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// POST /api/deposits - initiate a deposit (from Deposits.jsx onSubmit)
router.post('/deposits', protect, async (req, res) => {
  const { amount, payment_method } = req.body;
  if (!amount || amount < 50) {
    return res.status(400).json({ message: 'Amount must be at least 50' });
  }
  if (!payment_method) {
    return res.status(400).json({ message: 'Payment method required' });
  }
  
  const deposit = await Deposit.create({
    user: req.user._id,
    amount,
    paymentMethod: payment_method,
    status: 'pending'
  });
  
  // Create a pending transaction record
  await Transaction.create({
    user: req.user._id,
    amount,
    type: 'deposit',
    status: 'pending',
    description: `Deposit via ${payment_method}`
  });
  
  res.status(201).json({
    message: 'Deposit initiated successfully',
    depositId: deposit._id,
    // In real app, you would return payment details (wallet address, etc.)
    paymentDetails: {
      address: '0x1234567890abcdef',
      network: payment_method,
      amountToSend: amount
    }
  });
});

// GET /api/deposits/history - optional, for viewing past deposits (not in frontend but can be used)
router.get('/deposits/history', protect, async (req, res) => {
  const deposits = await Deposit.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(deposits);
});

module.exports = router;