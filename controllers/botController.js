const BotPurchase = require('../models/BotPurchase');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// POST /api/bots/purchase
exports.purchaseBot = async (req, res) => {
  try {
    const { botId, botName, amount, duration, endDate } = req.body;
    const user = req.user;

    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });
    if (user.balance < amount) return res.status(400).json({ message: 'Insufficient balance' });

    // Deduct balance
    user.balance -= amount;
    await user.save();

    const purchase = await BotPurchase.create({
      user: user._id,
      botId,
      botName,
      amount,
      duration,
      endDate: endDate || new Date(Date.now() + (duration === '7 days' ? 7 : duration === '30 Days' ? 30 : 365) * 24 * 60 * 60 * 1000)
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