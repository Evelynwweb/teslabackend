const CopyTradeInvestment = require('../models/CopyTradeInvestment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { parseAmount, debitBalance } = require('../utils/balance');
const { durationToDays } = require('../utils/duration');

// POST /api/copy-trade/invest
exports.investCopyTrade = async (req, res) => {
  try {
    const { traderId, traderName, duration } = req.body;
    const amount = parseAmount(req.body.amount);
    const user = req.user;

    // A missing check here let a negative amount *add* money to the balance
    if (!amount) return res.status(400).json({ message: 'Invalid amount' });
    if (!(await debitBalance(user._id, amount))) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const days = durationToDays(duration) || 30;
    const investment = await CopyTradeInvestment.create({
      user: user._id,
      traderId,
      traderName,
      amount,
      duration,
      endDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    });

    await Transaction.create({
      user: user._id,
      amount: -amount,
      type: 'investment',
      description: `Copy trading ${traderName}`,
      status: 'completed'
    });

    res.status(201).json({ message: 'Copy trade investment successful', investment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};