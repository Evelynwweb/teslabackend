const express = require('express');
const router = express.Router();
const { protect, notWhileImpersonating } = require('../middleware/auth');
const { confirmPassword, createWithdrawal } = require('../controllers/withdrawalController');

router.post('/confirm-password', protect, notWhileImpersonating, confirmPassword);
router.post('/', protect, notWhileImpersonating, createWithdrawal);

module.exports = router;
