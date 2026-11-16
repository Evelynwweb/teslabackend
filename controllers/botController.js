const BotPurchase = require('../models/BotPurchase');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { parseAmount, debitBalance } = require('../utils/balance');
const { durationToDays } = require('../utils/duration');

// POST /api/bots/purchase
exports.purchaseBot = async (req, res) => {
  try {
    const { botId, botName, duration } = req.body;
    const amount = parseAmount(req.body.amount);
    const user = req.user;

    if (!amount) return res.status(400).json({ message: 'Invalid amount' });
    if (!(await debitBalance(user._id, amount))) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const days = durationToDays(duration) || 365;
    const purchase = await BotPurchase.create({
      user: user._id,
      botId,
      botName,
      amount,
      duration,
      endDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    });

    await Transaction.create({
      user: user._id,
      amount: -amount,
      type: 'investment',
      description: `Purchased ${botName} bot`,
      status: 'completed'
    });

    res.status(201).json({ message: 'Bot purchased successfully', purchase });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};