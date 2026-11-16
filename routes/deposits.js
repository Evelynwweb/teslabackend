const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, notWhileImpersonating } = require('../middleware/auth');
const Deposit = require('../models/Deposit');
const Transaction = require('../models/Transaction');
const PaymentSetting = require('../models/PaymentSetting');
const sendEmailJS = require('../utils/emailHelper');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

// Proofs are kept in memory and saved to MongoDB. Vercel's filesystem is
// read-only, so the old disk storage (./uploads) broke deposits in production.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type. Only JPG, PNG, PDF allowed.'));
  },
});

// Turn upload errors into a 400 with a readable message instead of a 500.
const uploadProof = (req, res, next) => {
  upload.single('proof')(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Proof file must be 5MB or smaller' : err.message;
    res.status(400).json({ message });
  });
};

// POST /api/deposits – initiate deposit with proof upload
router.post('/deposits', protect, notWhileImpersonating, uploadProof, async (req, res) => {
  try {
    const amount = parseFloat(req.body.amount);
    const paymentMethod = req.body.payment_method;
    const proofFile = req.file;

    if (!Number.isFinite(amount) || amount < 50) {
      return res.status(400).json({ message: 'Amount must be at least 50' });
    }
    if (!paymentMethod) {
      return res.status(400).json({ message: 'Payment method required' });
    }
    if (!proofFile) {
      return res.status(400).json({ message: 'Payment proof is required' });
    }

    const transaction = await Transaction.create({
      user: req.user._id,
      amount,
      type: 'deposit',
      status: 'pending',
      description: `Deposit via ${paymentMethod}`,
    });

    const deposit = await Deposit.create({
      user: req.user._id,
      amount,
      paymentMethod,
      status: 'pending',
      proof: {
        data: proofFile.buffer,
        contentType: proofFile.mimetype,
        filename: proofFile.originalname,
      },
      transaction: transaction._id,
    });

    // Send pending deposit email (reusing Login Alert template)
    (async () => {
      try {
        await sendEmailJS(process.env.EMAILJS_TEMPLATE_LOGIN, {
          name: req.user.name,
          username: req.user.username,
          email: req.user.email,
          subject: `Deposit Pending - $${amount}`,
          message: `Your deposit of $${amount} via ${paymentMethod} is pending. We will notify you once it's approved.`,
        });
      } catch (error) {
        console.error('Deposit Pending Email failed:', error.message);
      }
    })();

    // Return the real configured address for this method (was a fake placeholder)
    const settings = await PaymentSetting.getSettings();
    const addr = settings.depositAddresses.get(paymentMethod);

    res.status(201).json({
      message: 'Deposit initiated successfully',
      depositId: deposit._id,
      paymentDetails: {
        address: addr ? addr.address : '',
        network: addr ? addr.network : '',
        amountToSend: amount,
      },
    });
  } catch (error) {
    console.error('Deposit route error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/deposits/history
router.get('/deposits/history', protect, async (req, res) => {
  const deposits = await Deposit.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(deposits);
});

module.exports = router;
