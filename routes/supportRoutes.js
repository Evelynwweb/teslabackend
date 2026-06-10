const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { sendMessage, getUserMessages } = require('../controllers/supportController');

router.post('/send', protect, sendMessage);
router.get('/my-messages', protect, getUserMessages);

module.exports = router;