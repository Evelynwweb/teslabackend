const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { investStock } = require('../controllers/stockController');

router.post('/invest', protect, investStock);

module.exports = router;