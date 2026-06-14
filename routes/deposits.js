const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Deposit = require('../models/Deposit');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const sendEmailJS = require('../utils/emailHelper');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Make sure this folder exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, PDF allowed.'));
    }
  }
});

// POST /api/deposits – initiate deposit with proof upload
router.post('/deposits', protect, upload.single('proof'), async (req, res) => {
  try {
    // req.body now contains the text fields parsed by multer
    const { amount, payment_method } = req.body;
    const proofFile = req.file;

    if (!amount || amount < 50) {
      return res.status(400).json({ message: 'Amount must be at least 50' });
    }
    if (!payment_method) {
      return res.status(400).json({ message: 'Payment method required' });
    }
    if (!proofFile) {
      return res.status(400).json({ message: 'Payment proof is required' });
    }

    const deposit = await Deposit.create({
      user: req.user._id,
      amount: parseFloat(amount),
      paymentMethod: payment_method,
      status: 'pending',
      proofPath: proofFile.path // Save the file path for admin verification
    });

    await Transaction.create({
      user: req.user._id,
      amount: parseFloat(amount),
      type: 'deposit',
      status: 'pending',
      description: `Deposit via ${payment_method}`
    });

    // 📧 Send pending deposit email (reusing Login Alert template)
    (async () => {
      try {
        await sendEmailJS(process.env.EMAILJS_TEMPLATE_LOGIN, {
          name: req.user.name,
          username: req.user.username,
          email: req.user.email,
          subject: `Deposit Pending - $${parseFloat(amount)}`,
          message: `Your deposit of $${parseFloat(amount)} via ${payment_method} is pending. We will notify you once it's approved.`
        });
      } catch (error) {
        console.error("Deposit Pending Email failed:", error.message);
      }
    })();

    res.status(201).json({
      message: 'Deposit initiated successfully',
      depositId: deposit._id,
      paymentDetails: {
        address: '0x1234567890abcdef',
        network: payment_method,
        amountToSend: parseFloat(amount)
      }
    });
  } catch (error) {
    console.error('Deposit route error:', error);
    if (error.message === 'Invalid file type. Only JPG, PNG, PDF allowed.') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/deposits/history
router.get('/deposits/history', protect, async (req, res) => {
  const deposits = await Deposit.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(deposits);
});

module.exports = router;