const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getDepositMethods, getWithdrawalMethods, getDepositStats } = require('../controllers/userPaymentController');

router.get('/deposit-stats', protect, getDepositStats);

// Both endpoints require user to be logged in
router.get('/deposit-methods', protect, getDepositMethods);
router.get('/withdrawal-methods', protect, getWithdrawalMethods);

module.exports = router;