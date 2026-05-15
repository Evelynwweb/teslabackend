const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { investCopyTrade } = require('../controllers/copyTradeController');

router.post('/invest', protect, investCopyTrade);

module.exports = router;