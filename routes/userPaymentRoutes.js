const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getDepositMethods, getWithdrawalMethods } = require('../controllers/userPaymentController');

// Both endpoints require user to be logged in
router.get('/deposit-methods', protect, getDepositMethods);
router.get('/withdrawal-methods', protect, getWithdrawalMethods);

module.exports = router;