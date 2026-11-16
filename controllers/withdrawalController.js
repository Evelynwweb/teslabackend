const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const Transaction = require('../models/Transaction');
const sendEmailJS = require('../utils/emailHelper');
const { getGeneralSettings } = require('../utils/siteSettings');

exports.confirmPassword = async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ message: 'Password required' });
  const user = await User.findById(req.user._id);
  const isMatch = await user.matchPassword(password);
  // 400, not 401: the dashboard treats 401 as "session expired" and logs out
  if (!isMatch) return res.status(400).json({ message: 'Incorrect password' });
  res.json({ success: true });
};

exports.createWithdrawal = async (req, res) => {
  try {
    const { method, details, wcCode } = req.body;
    const amount = Number(req.body.amount);
    const user = req.user;
    const settings = await getGeneralSettings();

    if (!method) {
      return res.status(400).json({ message: 'Withdrawal method required' });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Enter a valid amount' });
    }
    if (amount < settings.minWithdrawal) {
      return res.status(400).json({ message: `Minimum withdrawal is $${settings.minWithdrawal}` });
    }
    if (settings.maxWithdrawal && amount > settings.maxWithdrawal) {
      return res.status(400).json({ message: `Maximum withdrawal is $${settings.maxWithdrawal}` });
    }

    const fee = +((amount * (settings.withdrawalFeePercent || 0)) / 100).toFixed(2);
    const total = +(amount + fee).toFixed(2);

    // Hold amount + fee now, atomically, so the same balance can't be
    // withdrawn twice while a request is pending. Refunded if rejected.
    const held = await User.findOneAndUpdate(
      { _id: user._id, balance: { $gte: total } },
      { $inc: { balance: -total } },
      { returnDocument: 'after' }
    );
    if (!held) {
      return res.status(400).json({ message: `Insufficient balance to cover $${amount} plus $${fee} fee` });
    }

    const transaction = await Transaction.create({
      user: user._id,
      amount: -total,
      type: 'withdrawal',
      status: 'pending',
      description: `Withdrawal via ${method} ($${amount} + $${fee} fee)`
    });

    const withdrawal = await Withdrawal.create({
      user: user._id,
      amount,
      fee,
      held: total,
      method,
      details: details || '',
      wcCode: wcCode || '',
      status: 'pending',
      transaction: transaction._id,
    });

    // 🔹 SEND PENDING WITHDRAWAL EMAIL
(async () => {
  try {
    await sendEmailJS(process.env.EMAILJS_TEMPLATE_LOGIN, {
      name: user.name,
      username: user.username,
      email: user.email,
      subject: `Withdrawal Pending - $${amount}`,
      message: `Your withdrawal of $${amount} via ${method} is pending. We will notify you once it's approved.`
    });
  } catch (error) {
    console.error("Withdrawal Pending Email failed:", error.message);
  }
})();

    res.status(201).json({ message: 'Withdrawal request submitted', withdrawalId: withdrawal._id });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};