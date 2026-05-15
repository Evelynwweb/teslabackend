const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getDeposits, getWithdrawals, getOthers } = require('../controllers/transactionController');

router.get('/deposits', protect, getDeposits);
router.get('/withdrawals', protect, getWithdrawals);
router.get('/others', protect, getOthers);

module.exports = router;