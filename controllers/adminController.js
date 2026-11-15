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
    const { amount, operation } = req.body; // operation: 'add' or 'subtract'
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
    const { adminReply } = req.body;
    const message = await SupportMessage.findByIdAndUpdate(
      id,
      { adminReply, status: 'replied', updatedAt: Date.now() },
      { new: true }
    );
    if (!message) return res.status(404).json({ message: 'Message not found' });
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
    const { status, totalReturns } = req.body;
    const investment = await UserInvestment.findById(id);
    if (!investment) return res.status(404).json({ message: 'Investment not found' });

    investment.status = status;
    if (totalReturns !== undefined) investment.totalReturns = totalReturns;
    await investment.save();

    // If status becomes 'completed' and totalReturns > 0, add profit to user balance
    if (status === 'completed' && totalReturns && totalReturns > 0) {
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
    const { profitAmount } = req.body;
    const investment = await StockInvestment.findById(id);
    if (!investment) return res.status(404).json({ message: 'Investment not found' });

    if (profitAmount <= 0) return res.status(400).json({ message: 'Profit amount must be positive' });

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
    const { profitAmount } = req.body;
    const investment = await UserInvestment.findById(id);
    if (!investment) return res.status(404).json({ message: 'Investment not found' });

    if (profitAmount <= 0) return res.status(400).json({ message: 'Profit amount must be positive' });

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
    const { stockId, name, symbol, min, max, duration } = req.body;
    // Check if stockId exists
    const existing = await Stock.findOne({ stockId });
    if (existing) return res.status(400).json({ message: 'Stock ID already exists' });
    
    const stock = await Stock.create({
      stockId,
      name,
      symbol,
      min,
      max,
      duration
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
    const updates = req.body;
    const stock = await Stock.findByIdAndUpdate(id, updates, { new: true });
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
    const { status, profit } = req.body;
    const investment = await StockInvestment.findById(id);
    if (!investment) return res.status(404).json({ message: 'Investment not found' });

    investment.status = status;
    if (profit !== undefined) investment.profit = profit;
    await investment.save();

    // If status is 'completed' and profit > 0, add profit to user balance?
    // Optional: Handle profit payout automatically
    if (status === 'completed' && profit && profit > 0) {
      const user = await User.findById(investment.user);
      if (user) {
        user.balance += profit;
        await user.save();
        // Create transaction record
        await Transaction.create({
          user: user._id,
          amount: profit,
          type: 'investment',
          description: `Profit from ${investment.stockName} stock investment`,
          status: 'completed'
        });
      }
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

    deposit.status = 'completed';
    await deposit.save();

    const user = await User.findById(deposit.user);
    if (user) {
      user.balance += deposit.amount;
      user.totalDeposited += deposit.amount;
      await user.save();
    }

    // 🔹 SEND DEPOSIT APPROVED EMAIL
    (async () => {
      try {
        await sendEmailJS(process.env.EMAILJS_TEMPLATE_LOGIN, {
          name: user.name,
          username: user.username,
          email: user.email,
          subject: `Deposit Approved - $${deposit.amount}`,
          message: `Your deposit of $${deposit.amount} via ${deposit.paymentMethod} has been approved. Your new balance is $${user.balance}.`
        });
      } catch (error) {
        console.error("Deposit Approved Email failed:", error.message);
      }
    })();

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

    // 🔹 SEND DEPOSIT REJECTED EMAIL
    const user = await User.findById(deposit.user);
    if (user) {
      (async () => {
  try {
    await sendEmailJS(process.env.EMAILJS_TEMPLATE_LOGIN, {
      name: user.name,
      username: user.username,
      email: user.email,
      subject: `Deposit Rejected - $${deposit.amount}`,
      message: `Your deposit of $${deposit.amount} via ${deposit.paymentMethod} has been rejected. Please contact support for more details.`
    });
  } catch (error) {
    console.error("Deposit Rejected Email failed:", error.message);
  }
})();
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

    if (!withdrawal) {
      return res.status(404).json({ message: 'Withdrawal not found' });
    }

    // 🔹 SEND WITHDRAWAL APPROVED EMAIL
    const user = await User.findById(withdrawal.user);
    if (user) {
      (async () => {
  try {
    await sendEmailJS(process.env.EMAILJS_TEMPLATE_LOGIN, {
      name: user.name,
      username: user.username,
      email: user.email,
      subject: `Withdrawal Approved - $${withdrawal.amount}`,
      message: `Your withdrawal of $${withdrawal.amount} via ${withdrawal.method} has been approved. Funds will be sent to your wallet.`
    });
  } catch (error) {
    console.error("Withdrawal Approved Email failed:", error.message);
  }
})();
    }

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

    if (!withdrawal) {
      return res.status(404).json({ message: 'Withdrawal not found' });
    }

    // 🔹 SEND WITHDRAWAL REJECTED EMAIL
    const user = await User.findById(withdrawal.user);
    if (user) {
     (async () => {
  try {
    await sendEmailJS(process.env.EMAILJS_TEMPLATE_LOGIN, {
      name: user.name,
      username: user.username,
      email: user.email,
      subject: `Withdrawal Rejected - $${withdrawal.amount}`,
      message: `Your withdrawal of $${withdrawal.amount} via ${withdrawal.method} has been rejected. Please contact support for more details.`
    });
  } catch (error) {
    console.error("Withdrawal Rejected Email failed:", error.message);
  }
})();
    }

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