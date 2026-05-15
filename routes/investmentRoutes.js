const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getMyInvestments } = require('../controllers/investmentController');

router.get('/my', protect, getMyInvestments);

module.exports = router;