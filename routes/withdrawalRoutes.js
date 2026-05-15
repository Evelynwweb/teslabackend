const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { confirmPassword, createWithdrawal } = require('../controllers/withdrawalController');

router.post('/confirm-password', protect, confirmPassword);
router.post('/', protect, createWithdrawal);

module.exports = router;