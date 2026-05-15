const UserInvestment = require('../models/UserInvestment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Plan = require('../models/Plan');


// GET /api/investment-plans
exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ status: 'active' }).select('name min_amount max_amount duration');
    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/investment-plans/join
exports.joinPlan = async (req, res) => {
  try {
    const { planId, planName, amount, duration, endDate } = req.body;
    const user = req.user;

    if (user.balance < amount) return res.status(400).json({ message: 'Insufficient balance' });

    user.balance -= amount;
    await user.save();

    const investment = await UserInvestment.create({
      user: user._id,
      planName,
      amount,
      roiPercentage: 0, // can be fetched from a Plan model, but here just placeholder
      duration,
      endDate: endDate || new Date(Date.now() + (duration === '14 Days' ? 14 : duration === '21 Days' ? 21 : duration === '30 Days' ? 30 : duration === '60 Days' ? 60 : 30) * 24 * 60 * 60 * 1000)
    });

    await Transaction.create({
      user: user._id,
      amount: -amount,
      type: 'investment',
      description: `Joined ${planName} plan`,
      status: 'completed'
    });

    res.status(201).json({ message: 'Investment plan joined', investment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};