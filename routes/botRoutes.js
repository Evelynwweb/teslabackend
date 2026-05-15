const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { purchaseBot } = require('../controllers/botController');

router.post('/purchase', protect, purchaseBot);

module.exports = router;