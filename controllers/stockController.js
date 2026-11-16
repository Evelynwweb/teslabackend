const StockInvestment = require('../models/StockInvestment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Stock = require('../models/Stock');
const { parseAmount, debitBalance } = require('../utils/balance');
const { durationToDays } = require('../utils/duration');


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
    const amount = parseAmount(req.body.amount);
    const user = req.user;

    // Everything except the amount comes from the stored stock. The client
    // used to be able to send its own dailyProfitRate and endDate.
    const stock = await Stock.findOne({ stockId: req.body.stockId });
    if (!stock) return res.status(404).json({ message: 'Stock not found' });

    if (!amount) return res.status(400).json({ message: 'Invalid amount' });
    if ((stock.min && amount < stock.min) || (stock.max && amount > stock.max)) {
      return res.status(400).json({ message: `Amount must be between $${stock.min} and $${stock.max}` });
    }
    if (!(await debitBalance(user._id, amount))) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const days = durationToDays(stock.duration) || 365;
    const startDate = new Date();
    const investment = await StockInvestment.create({
      user: user._id,
      stockId: stock.stockId,
      stockName: stock.name,
      symbol: stock.symbol,
      amount,
      duration: stock.duration || `${days} Days`,
      startDate,
      lastProfitDate: startDate,
      dailyProfitRate: stock.dailyProfitRate ?? 0.5,
      endDate: new Date(startDate.getTime() + days * 86400000),
    });

    await Transaction.create({
      user: user._id,
      amount: -amount,
      type: 'investment',
      description: `Invested in ${stock.name} stock`,
      status: 'completed',
    });

    res.status(201).json({ message: 'Stock investment successful', investment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};