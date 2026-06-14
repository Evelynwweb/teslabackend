const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const Transaction = require('../models/Transaction');
const sendEmailJS = require('../utils/emailHelper');  // <--- ADD THIS

exports.confirmPassword = async (req, res) => {
  const { password } = req.body;
  const user = await User.findById(req.user._id);
  const isMatch = await user.matchPassword(password);
  if (!isMatch) return res.status(401).json({ message: 'Incorrect password' });
  res.json({ success: true });
};

exports.createWithdrawal = async (req, res) => {
  try {
    const { amount, method, details, wcCode } = req.body;
    const user = req.user;

    if (!amount || amount < 10) {
      return res.status(400).json({ message: 'Minimum withdrawal is $10' });
    }
    if (user.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    const withdrawal = await Withdrawal.create({
      user: user._id,
      amount,
      method,
      details: details || '',
      wcCode: wcCode || '',
      status: 'pending'
    });

    await Transaction.create({
      user: user._id,
      amount: -amount,
      type: 'withdrawal',
      status: 'pending',
      description: `Withdrawal via ${method}`
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