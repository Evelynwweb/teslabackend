const User = require('../models/User');
const Deposit = require('../models/Deposit');
const Withdrawal = require('../models/Withdrawal');
const StockInvestment = require('../models/StockInvestment');
const PlanInvestment = require('../models/PlanInvestment');
const UserInvestment = require('../models/UserInvestment');
const Transaction = require('../models/Transaction');
const TradingHistory = require('../models/TradingHistory');
const Stock = require('../models/Stock');
const SupportMessage = require('../models/SupportMessage');
const jwt = require('jsonwebtoken');
const sendEmailJS = require('../utils/emailHelper');
const { durationToDays } = require('../utils/duration');

// Admin login (must generate token)
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const login = String(email || '').trim().toLowerCase();
    if (!login || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: login });
    // 400 (not 401) so the admin app shows the message instead of a session-expired redirect
    if (!user || !(await user.matchPassword(password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    if (user.role !== 'admin') return res.status(403).json({ message: 'Not an admin' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/me – the signed-in admin (for the header)
exports.getMe = async (req, res) => {
  const { _id, name, email, role } = req.user;
  res.json({ id: _id, name, email, role });
};

const sumAmount = async (Model, match) => {
  const r = await Model.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
  return r[0]?.total || 0;
};

// Dashboard stats – all computed from the database
exports.getStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalDeposits,
      totalWithdrawals,
      pendingDeposits,
      pendingWithdrawals,
      activeStock,
      activePlans,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      sumAmount(Deposit, { status: 'completed' }),
      sumAmount(Withdrawal, { status: 'completed' }),
      Deposit.countDocuments({ status: 'pending' }),
      Withdrawal.countDocuments({ status: 'pending' }),
      StockInvestment.countDocuments({ status: 'active' }),
      UserInvestment.countDocuments({ status: 'active' }),
    ]);
    res.json({
      totalUsers,
      totalDeposits,
      totalWithdrawals,
      pendingDeposits,
      pendingWithdrawals,
      activeInvestments: activeStock + activePlans,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Escape user input before using it in a regex ("(" used to crash the search)
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Get all users (paginated)
exports.getUsers = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 10;
  const search = String(req.query.search || '').trim();
  const rx = search ? { $regex: escapeRegex(search), $options: 'i' } : null;
  const query = rx ? { $or: [{ name: rx }, { email: rx }, { username: rx }] } : {};
  try {
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await User.countDocuments(query);
    res.json({ users, totalPages: Math.max(1, Math.ceil(total / limit)), currentPage: page, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Suspend/activate user
exports.updateUserStatus = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: Boolean(req.body.isActive) },
      { returnDocument: 'after' }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/admin/users/:id/impersonate – short-lived token to open the
// user's dashboard as them (support). The token carries `imp` so the API
// can flag, log and restrict the session (see middleware/auth.js).
exports.impersonateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('name email role');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Admin accounts cannot be impersonated' });
    }
    const token = jwt.sign(
      { id: user._id, imp: String(req.user._id) },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log(`[IMPERSONATION] admin=${req.user._id} (${req.user.email}) started session as user=${user._id} (${user.email})`);
    res.json({ token, expiresIn: 3600, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/admin/deposits/:id/proof – streams the uploaded payment proof
exports.getDepositProof = async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id).select('+proof.data');
    if (!deposit) return res.status(404).json({ message: 'Deposit not found' });
    if (!deposit.proof || !deposit.proof.data) {
      return res.status(404).json({ message: 'No proof was stored for this deposit' });
    }
    res.set('Content-Type', deposit.proof.contentType || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="${(deposit.proof.filename || 'proof').replace(/"/g, '')}"`);
    res.send(deposit.proof.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Get single user details (for view/edit modal)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update user (admin)
exports.updateUser = async (req, res) => {
  try {
    const { name, email, phone, country, balance, isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Prevent email duplication (except self)
    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ message: 'Email already in use' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (country) user.country = country;
    if (balance !== undefined) user.balance = balance;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add/remove balance (admin)
exports.adjustUserBalance = async (req, res) => {
  try {
    const { operation } = req.body; // operation: 'add' or 'subtract'
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Enter a valid positive amount' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let newBalance = user.balance;
    if (operation === 'add') newBalance += amount;
    else if (operation === 'subtract') newBalance -= amount;
    else return res.status(400).json({ message: 'Invalid operation' });

    if (newBalance < 0) return res.status(400).json({ message: 'Balance cannot be negative' });

    user.balance = newBalance;
    await user.save();

    await Transaction.create({
      user: user._id,
      amount: operation === 'add' ? amount : -amount,
      type: 'admin_adjustment',
      description: `Admin ${operation === 'add' ? 'credited' : 'debited'} $${amount}`,
      status: 'completed'
    });

    res.json({ message: `Balance ${operation === 'add' ? 'added' : 'subtracted'}`, newBalance: user.balance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ========== SUPPORT MESSAGES (ADMIN) ==========

exports.getAllMessages = async (req, res) => {
  try {
    const messages = await SupportMessage.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await SupportMessage.findByIdAndUpdate(
      id,
      { status: 'read', updatedAt: Date.now() },
      { new: true }
    );
    if (!message) return res.status(404).json({ message: 'Message not found' });
    res.json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.replyToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const adminReply = String(req.body.adminReply || '').trim();
    if (!adminReply) return res.status(400).json({ message: 'Reply cannot be empty' });
    const message = await SupportMessage.findByIdAndUpdate(
      id,
      { adminReply, status: 'replied', updatedAt: Date.now() },
      { returnDocument: 'after' }
    ).populate('user', 'name username email');
    if (!message) return res.status(404).json({ message: 'Message not found' });

    // The user dashboard has no inbox, so the reply is delivered by email
    notify(
      message.user,
      `Re: ${message.subject}`,
      `${adminReply}\n\n— In reply to your message: "${message.message}"`
    );

    res.json(message);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await SupportMessage.countDocuments({ status: 'unread' });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Investment plans CRUD
const Plan = require('../models/Plan');

const readPlan = (body) => {
  const plan = {
    name: String(body.name || '').trim(),
    min_amount: Number(body.min_amount),
    max_amount: Number(body.max_amount),
    duration: String(body.duration || '').trim(),
    roi_percentage: Number(body.roi_percentage),
  };
  if (body.status) plan.status = body.status === 'inactive' ? 'inactive' : 'active';
  if (!plan.name) return { error: 'Plan name is required' };
  if (!Number.isFinite(plan.min_amount) || plan.min_amount <= 0) return { error: 'Min amount must be a positive number' };
  if (!Number.isFinite(plan.max_amount) || plan.max_amount < plan.min_amount) return { error: 'Max amount must be at least the min amount' };
  if (!durationToDays(plan.duration)) return { error: 'Duration must look like "30 Days", "2 Weeks" or "6 Months"' };
  if (!Number.isFinite(plan.roi_percentage) || plan.roi_percentage < 0) return { error: 'ROI % must be zero or more' };
  return { plan };
};

exports.getPlans = async (req, res) => {
  try {
    res.json(await Plan.find().sort({ min_amount: 1 }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.createPlan = async (req, res) => {
  try {
    const { plan, error } = readPlan(req.body);
    if (error) return res.status(400).json({ message: error });
    res.status(201).json(await Plan.create(plan));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.updatePlan = async (req, res) => {
  try {
    const { plan, error } = readPlan(req.body);
    if (error) return res.status(400).json({ message: error });
    const updated = await Plan.findByIdAndUpdate(req.params.id, plan, { returnDocument: 'after' });
    if (!updated) return res.status(404).json({ message: 'Plan not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.deletePlan = async (req, res) => {
  try {
    const deleted = await Plan.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Plan not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// GET all user investments (populate user and plan details if needed)
exports.getUserInvestments = async (req, res) => {
  try {
    const investments = await UserInvestment.find()
      .populate('user', 'name email balance')
      .sort({ startDate: -1 });
    res.json(investments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE user investment status (active -> completed/cancelled) and add totalReturns
exports.updateUserInvestment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const totalReturns = req.body.totalReturns !== undefined ? Number(req.body.totalReturns) : undefined;
    if (totalReturns !== undefined && (!Number.isFinite(totalReturns) || totalReturns < 0)) {
      return res.status(400).json({ message: 'Total returns must be a positive number' });
    }
    const investment = await UserInvestment.findById(id);
    if (!investment) return res.status(404).json({ message: 'Investment not found' });
    const wasCompleted = investment.status === 'completed';

    investment.status = status;
    if (totalReturns !== undefined) investment.totalReturns = totalReturns;
    await investment.save();

    // Credit the profit once, when the plan first becomes completed
    // (re-saving a completed plan used to pay the profit again each time).
    if (status === 'completed' && !wasCompleted && totalReturns && totalReturns > 0) {
      const user = await User.findById(investment.user);
      if (user) {
        const profit = totalReturns - investment.amount;
        if (profit > 0) {
          user.balance += profit;
          user.profit += profit;
          await user.save();
          // Record transaction
          await Transaction.create({
            user: user._id,
            amount: profit,
            type: 'investment',
            description: `ROI profit from ${investment.planName} plan`,
            status: 'completed'
          });
        }
      }
    }

    res.json(investment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE user investment (admin only)
exports.deleteUserInvestment = async (req, res) => {
  try {
    const { id } = req.params;
    await UserInvestment.findByIdAndDelete(id);
    res.json({ message: 'Investment record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// Add profit to a stock investment
exports.addStockInvestmentProfit = async (req, res) => {
  try {
    const { id } = req.params;
    const profitAmount = Number(req.body.profitAmount);
    const investment = await StockInvestment.findById(id);
    if (!investment) return res.status(404).json({ message: 'Investment not found' });

    if (!Number.isFinite(profitAmount) || profitAmount <= 0) return res.status(400).json({ message: 'Profit amount must be positive' });

    // Update investment profit (accumulate)
    investment.profit = (investment.profit || 0) + profitAmount;
    await investment.save();

    // Credit user balance
    const user = await User.findById(investment.user);
    if (user) {
      user.balance += profitAmount;
      user.profit += profitAmount;
      await user.save();
    }

    // Create trading history entry
    await TradingHistory.create({
      user: investment.user,
      investmentId: investment._id,
      amount: profitAmount,
      type: 'Stock Profit',
      description: `Profit from ${investment.stockName} stock investment`
    });

    // Create transaction record
    await Transaction.create({
      user: investment.user,
      amount: profitAmount,
      type: 'investment',
      description: `Profit from ${investment.stockName} stock investment`,
      status: 'completed'
    });

    res.json({ message: 'Profit added successfully', profit: investment.profit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Add profit to a plan investment (UserInvestment)
exports.addPlanInvestmentProfit = async (req, res) => {
  try {
    const { id } = req.params;
    const profitAmount = Number(req.body.profitAmount);
    const investment = await UserInvestment.findById(id);
    if (!investment) return res.status(404).json({ message: 'Investment not found' });

    if (!Number.isFinite(profitAmount) || profitAmount <= 0) return res.status(400).json({ message: 'Profit amount must be positive' });

    // Update totalReturns (accumulate)
    investment.totalReturns = (investment.totalReturns || 0) + profitAmount;
    await investment.save();

    const user = await User.findById(investment.user);
    if (user) {
      user.balance += profitAmount;
      user.profit += profitAmount;
      await user.save();
    }

    await TradingHistory.create({
      user: investment.user,
      investmentId: investment._id,
      amount: profitAmount,
      type: 'Plan ROI',
      description: `ROI from ${investment.planName} plan`
    });

    await Transaction.create({
      user: investment.user,
      amount: profitAmount,
      type: 'investment',
      description: `ROI from ${investment.planName} plan`,
      status: 'completed'
    });

    res.json({ message: 'Profit added', totalReturns: investment.totalReturns });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};




// GET all stocks (admin)
exports.getStocksAdmin = async (req, res) => {
  try {
    const stocks = await Stock.find().sort({ stockId: 1 });
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// CREATE new stock
exports.createStock = async (req, res) => {
  try {
    const { stockId, name, symbol, min, max, duration, dailyProfitRate } = req.body;
    if (!stockId || !name || !symbol) {
      return res.status(400).json({ message: 'Stock ID, name and symbol are required' });
    }
    if (Number(min) > Number(max)) {
      return res.status(400).json({ message: 'Minimum cannot exceed maximum' });
    }
    // Check if stockId exists
    const existing = await Stock.findOne({ stockId });
    if (existing) return res.status(400).json({ message: 'Stock ID already exists' });

    const stock = await Stock.create({
      stockId,
      name,
      symbol,
      min,
      max,
      duration,
      ...(dailyProfitRate !== undefined && dailyProfitRate !== '' && { dailyProfitRate: Number(dailyProfitRate) }),
    });
    res.status(201).json(stock);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE stock
exports.updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    // Only known fields (the whole body used to be written as-is)
    const updates = {};
    for (const key of ['stockId', 'name', 'symbol', 'min', 'max', 'duration', 'dailyProfitRate']) {
      if (req.body[key] !== undefined && req.body[key] !== '') updates[key] = req.body[key];
    }
    const stock = await Stock.findByIdAndUpdate(id, updates, { returnDocument: 'after', runValidators: true });
    if (!stock) return res.status(404).json({ message: 'Stock not found' });
    res.json(stock);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE stock
exports.deleteStock = async (req, res) => {
  try {
    const { id } = req.params;
    const stock = await Stock.findByIdAndDelete(id);
    if (!stock) return res.status(404).json({ message: 'Stock not found' });
    res.json({ message: 'Stock deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET all stock investments (with user details)
exports.getStockInvestments = async (req, res) => {
  try {
    const investments = await StockInvestment.find()
      .populate('user', 'name email balance')
      .sort({ createdAt: -1 });
    res.json(investments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE stock investment status (complete/cancel)
exports.updateStockInvestmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['active', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const investment = await StockInvestment.findById(id);
    if (!investment) return res.status(404).json({ message: 'Investment not found' });

    const wasCompleted = investment.status === 'completed';
    const previousProfit = investment.profit || 0;
    const newProfit = req.body.profit !== undefined ? Number(req.body.profit) : previousProfit;
    if (!Number.isFinite(newProfit) || newProfit < 0) {
      return res.status(400).json({ message: 'Profit must be a positive number' });
    }

    investment.status = status;
    investment.profit = Math.max(previousProfit, newProfit);
    await investment.save();

    // Pay out only once, when the investment becomes completed, and only the
    // part not already credited (the daily job credits profit as it accrues).
    const owed = +(newProfit - previousProfit).toFixed(8);
    if (status === 'completed' && !wasCompleted && owed > 0) {
      await User.updateOne({ _id: investment.user }, { $inc: { balance: owed, profit: owed } });
      await Transaction.create({
        user: investment.user,
        amount: owed,
        type: 'profit',
        description: `Final profit from ${investment.stockName} stock investment`,
        status: 'completed'
      });
    }

    res.json(investment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE stock investment (admin only, careful)
exports.deleteStockInvestment = async (req, res) => {
  try {
    const { id } = req.params;
    await StockInvestment.findByIdAndDelete(id);
    res.json({ message: 'Investment record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Deposits
exports.getDeposits = async (req, res) => {
  try {
    const deposits = await Deposit.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    // proof.data is excluded by the schema; tell the UI whether a file exists
    res.json(deposits.map((d) => ({ ...d, hasProof: Boolean(d.proof && d.proof.contentType) })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const notify = (user, subject, message) => {
  if (!user) return;
  (async () => {
    try {
      await sendEmailJS(process.env.EMAILJS_TEMPLATE_LOGIN, {
        name: user.name,
        username: user.username,
        email: user.email,
        subject,
        message,
      });
    } catch (error) {
      console.error(`Email "${subject}" failed:`, error.message);
    }
  })();
};

const setTransactionStatus = async (id, status) => {
  if (id) await Transaction.updateOne({ _id: id }, { $set: { status } });
};

const alreadyProcessed = async (Model, id, res, label) => {
  const exists = await Model.exists({ _id: id });
  return res
    .status(exists ? 400 : 404)
    .json({ message: exists ? `${label} already processed` : `${label} not found` });
};

exports.approveDeposit = async (req, res) => {
  try {
    // Atomic pending -> completed so a double click can't credit twice
    const deposit = await Deposit.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: { status: 'completed' } },
      { returnDocument: 'after' }
    );
    if (!deposit) return alreadyProcessed(Deposit, req.params.id, res, 'Deposit');

    const user = await User.findOneAndUpdate(
      { _id: deposit.user },
      { $inc: { balance: deposit.amount, totalDeposited: deposit.amount } },
      { returnDocument: 'after' }
    );
    await setTransactionStatus(deposit.transaction, 'completed');

    notify(
      user,
      `Deposit Approved - $${deposit.amount}`,
      `Your deposit of $${deposit.amount} via ${deposit.paymentMethod} has been approved. Your new balance is $${user ? user.balance : ''}.`
    );

    res.json({ message: 'Deposit approved and balance credited' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.rejectDeposit = async (req, res) => {
  try {
    const deposit = await Deposit.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: { status: 'failed' } },
      { returnDocument: 'after' }
    );
    if (!deposit) return alreadyProcessed(Deposit, req.params.id, res, 'Deposit');
    await setTransactionStatus(deposit.transaction, 'failed');

    const user = await User.findById(deposit.user);
    notify(
      user,
      `Deposit Rejected - $${deposit.amount}`,
      `Your deposit of $${deposit.amount} via ${deposit.paymentMethod} has been rejected. Please contact support for more details.`
    );

    res.json({ message: 'Deposit rejected' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Withdrawals
exports.getWithdrawals = async (req, res) => {
  try {
    const withdrawals = await Withdrawal.find()
      .populate('user', 'name email balance')
      .sort({ createdAt: -1 });
    res.json(withdrawals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.approveWithdrawal = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: { status: 'completed', processedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!withdrawal) return alreadyProcessed(Withdrawal, req.params.id, res, 'Withdrawal');

    // Requests made since holds were introduced already took the money.
    // Older ones (held = 0) are charged now, if the balance still covers them.
    const inc = { totalWithdrawn: withdrawal.amount };
    let filter = { _id: withdrawal.user };
    if (!withdrawal.held) {
      const charge = withdrawal.amount + (withdrawal.fee || 0);
      inc.balance = -charge;
      filter = { _id: withdrawal.user, balance: { $gte: charge } };
    }
    const user = await User.findOneAndUpdate(filter, { $inc: inc }, { returnDocument: 'after' });
    if (!user) {
      // Roll back: an old request the user can no longer cover
      await Withdrawal.updateOne(
        { _id: withdrawal._id },
        { $set: { status: 'pending' }, $unset: { processedAt: 1 } }
      );
      return res.status(400).json({ message: 'User balance no longer covers this withdrawal' });
    }
    await setTransactionStatus(withdrawal.transaction, 'completed');

    notify(
      user,
      `Withdrawal Approved - $${withdrawal.amount}`,
      `Your withdrawal of $${withdrawal.amount} via ${withdrawal.method} has been approved. Funds will be sent to your wallet.`
    );

    res.json({ message: 'Approved', withdrawal });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.rejectWithdrawal = async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: { status: 'failed', processedAt: new Date() } },
      { returnDocument: 'after' }
    );
    if (!withdrawal) return alreadyProcessed(Withdrawal, req.params.id, res, 'Withdrawal');

    // Give back whatever was held when the request was made
    let user;
    if (withdrawal.held > 0) {
      user = await User.findOneAndUpdate(
        { _id: withdrawal.user },
        { $inc: { balance: withdrawal.held } },
        { returnDocument: 'after' }
      );
    } else {
      user = await User.findById(withdrawal.user);
    }
    await setTransactionStatus(withdrawal.transaction, 'failed');

    const refundNote = withdrawal.held > 0 ? ` and $${withdrawal.held} was returned to your balance` : '';
    notify(
      user,
      `Withdrawal Rejected - $${withdrawal.amount}`,
      `Your withdrawal of $${withdrawal.amount} via ${withdrawal.method} has been rejected${refundNote}. Please contact support for more details.`
    );

    res.json({ message: 'Rejected', withdrawal });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const currentAdminId = req.user.id; // from protect middleware

    // Optional: prevent admin from deleting themselves
    if (userId === currentAdminId) {
      return res.status(400).json({ message: 'You cannot delete your own admin account.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Optional: prevent deletion of other admins (only if you want)
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete another admin user.' });
    }

    await User.findByIdAndDelete(userId);

    // (Optional) Also delete related records: deposits, withdrawals, investments, etc.
    // This is a soft-delete alternative – but here we do hard delete.
    // You may want to keep audit logs or just remove everything.
    // Example:
    // await Deposit.deleteMany({ user: userId });
    // await Withdrawal.deleteMany({ user: userId });
    // await UserInvestment.deleteMany({ user: userId });
    // etc.

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};