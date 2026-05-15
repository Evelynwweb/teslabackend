const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getStocks, investStock } = require('../controllers/stockController');

router.get('/', getStocks);                 // <-- add this line
router.post('/invest', protect, investStock);

module.exports = router;