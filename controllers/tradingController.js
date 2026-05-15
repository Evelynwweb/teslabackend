const TradingHistory = require('../models/TradingHistory');
const UserInvestment = require('../models/UserInvestment');

exports.getTradingHistory = async (req, res) => {
  const history = await TradingHistory.find({ user: req.user._id })
    .populate('investmentId', 'planName amount')
    .sort({ createdAt: -1 });

  // Summary stats for the cards in TradingHistory.jsx
  const totalReturns = history.reduce((sum, h) => sum + h.amount, 0);
  const lastReturn = history.length > 0 ? history[0].amount : 0;
  const totalTransactions = history.length;

  res.json({
    totalReturns,
    lastReturn,
    totalTransactions,
    history
  });
};