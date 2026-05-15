const StockInvestment = require('../models/StockInvestment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Stock = require('../models/Stock');


exports.getStocks = async (req, res) => {
  try {
    const stocks = await Stock.find();
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/stocks/invest
exports.investStock = async (req, res) => {
  try {
    const { stockId, stockName, symbol, amount, duration, endDate } = req.body;
    const user = req.user;

    if (user.balance < amount) return res.status(400).json({ message: 'Insufficient balance' });

    user.balance -= amount;
    await user.save();

    const investment = await StockInvestment.create({
      user: user._id,
      stockId,
      stockName,
      symbol,
      amount,
      duration,
      endDate: endDate || new Date(Date.now() + (duration === '6 Months' ? 180 : 365) * 24 * 60 * 60 * 1000)
    });

    await Transaction.create({
      user: user._id,
      amount: -amount,
      type: 'investment',
      description: `Invested in ${stockName} stock`,
      status: 'completed'
    });

    res.status(201).json({ message: 'Stock investment successful', investment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};