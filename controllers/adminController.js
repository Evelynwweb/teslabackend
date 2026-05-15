const User = require('../models/User');
const Deposit = require('../models/Deposit');
const Withdrawal = require('../models/Withdrawal');
const jwt = require('jsonwebtoken');

// Admin login (must generate token)
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    
    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });
    
    if (user.role !== 'admin') return res.status(403).json({ message: 'Not an admin' });
    
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Dashboard stats (simplified – adapt to your models)
exports.getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    res.json({ totalUsers, totalDeposits: 0, totalWithdrawals: 0, pendingDeposits: 0, pendingWithdrawals: 0, activeInvestments: 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all users (paginated)
exports.getUsers = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const search = req.query.search || '';
  const query = search ? { $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] } : {};
  try {
    const users = await User.find(query).select('-password').skip((page-1)*limit).limit(limit);
    const total = await User.countDocuments(query);
    res.json({ users, totalPages: Math.ceil(total/limit), currentPage: page });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Suspend/activate user
exports.updateUserStatus = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Investment plans CRUD (assuming you have Plan model – if not, create a simple one)
exports.getPlans = async (req, res) => {
  const Plan = require('../models/Plan');
  const plans = await Plan.find();
  res.json(plans);
};
exports.createPlan = async (req, res) => {
  const Plan = require('../models/Plan');
  const plan = await Plan.create(req.body);
  res.status(201).json(plan);
};
exports.updatePlan = async (req, res) => {
  const Plan = require('../models/Plan');
  const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(plan);
};
exports.deletePlan = async (req, res) => {
  const Plan = require('../models/Plan');
  await Plan.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
};

// Deposits
exports.getDeposits = async (req, res) => {
  try {
    const deposits = await Deposit.find()
      .populate('user', 'name email')  // attach user name/email
      .sort({ createdAt: -1 });
    res.json(deposits);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.approveDeposit = async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id);
    if (!deposit) {
      return res.status(404).json({ message: 'Deposit not found' });
    }
    if (deposit.status !== 'pending') {
      return res.status(400).json({ message: 'Deposit already processed' });
    }

    // Update deposit status
    deposit.status = 'completed';
    await deposit.save();

    // Credit user balance and total deposited
    const user = await User.findById(deposit.user);
    if (user) {
      user.balance += deposit.amount;
      user.totalDeposited += deposit.amount;
      await user.save();
    }

    res.json({ message: 'Deposit approved and balance credited' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.rejectDeposit = async (req, res) => {
  try {
    const deposit = await Deposit.findByIdAndUpdate(
      req.params.id,
      { status: 'failed' },
      { new: true }
    );
    if (!deposit) {
      return res.status(404).json({ message: 'Deposit not found' });
    }
    res.json({ message: 'Deposit rejected' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Withdrawals
exports.getWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json(withdrawals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.approveWithdrawal = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findByIdAndUpdate(
      req.params.id,
      { status: 'completed' },
      { new: true }
    );
    res.json({ message: 'Approved', withdrawal });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.rejectWithdrawal = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findByIdAndUpdate(
      req.params.id,
      { status: 'failed' },
      { new: true }
    );
    res.json({ message: 'Rejected', withdrawal });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};