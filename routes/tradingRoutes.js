const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getTradingHistory } = require('../controllers/tradingController');

router.get('/history', protect, getTradingHistory);

module.exports = router;