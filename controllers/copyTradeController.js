const CopyTradeInvestment = require('../models/CopyTradeInvestment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// POST /api/copy-trade/invest
exports.investCopyTrade = async (req, res) => {
  try {
    const { traderId, traderName, amount, duration, endDate } = req.body;
    const user = req.user;

    if (user.balance < amount) return res.status(400).json({ message: 'Insufficient balance' });

    user.balance -= amount;
    await user.save();

    const investment = await CopyTradeInvestment.create({
      user: user._id,
      traderId,
      traderName,
      amount,
      duration,
      endDate: endDate || new Date(Date.now() + (duration === '14 Days' ? 14 : duration === '30 Days' ? 30 : duration === '60 Days' ? 60 : 30) * 24 * 60 * 60 * 1000)
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