const express = require('express');
const router = express.Router();

// GET /api/payment-methods - matches the selectMethod call in Deposits.jsx
router.get('/payment-methods', (req, res) => {
  const methods = [
    { id: '22', name: 'USDT (ERC20)', icon: '/images/usdt.png' },
    { id: '17', name: 'USDT (TRC20)', icon: '/images/usdt.png' },
    { id: '2', name: 'Ethereum (ERC20)', icon: '/images/eth.png' },
    { id: '1', name: 'Bitcoin', icon: '/images/btc.png' },
  ];
  res.json(methods);
});

// GET /api/get-method/:id - called when user selects a method
router.get('/get-method/:id', (req, res) => {
  const methods = {
    '22': 'USDT (ERC20)',
    '17': 'USDT (TRC20)',
    '2': 'Ethereum (ERC20)',
    '1': 'Bitcoin',
  };
  const methodName = methods[req.params.id] || 'Unknown';
  res.json(methodName);
});

module.exports = router;