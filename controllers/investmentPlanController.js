const UserInvestment = require('../models/UserInvestment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Plan = require('../models/Plan');
const { durationToDays } = require('../utils/duration');

const DAY = 24 * 60 * 60 * 1000;

// GET /api/investment-plans
exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.find({ status: 'active' })
      .select('name min_amount max_amount duration roi_percentage')
      .sort({ min_amount: 1 });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/investment-plans/join
// Plan name, limits, ROI and duration come from the stored plan, not the
// request body (they used to be trusted from the client, with ROI always 0).
exports.joinPlan = async (req, res) => {
  try {
    const { planId } = req.body;
    const amount = Number(req.body.amount);

    const plan = planId ? await Plan.findOne({ _id: planId, status: 'active' }) : null;
    if (!plan) return res.status(404).json({ message: 'Plan not found or no longer available' });

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Enter a valid amount' });
    }
    if (amount < plan.min_amount || (plan.max_amount && amount > plan.max_amount)) {
      return res.status(400).json({ message: `Amount must be between $${plan.min_amount} and $${plan.max_amount}` });
    }

    // Atomic debit: fails cleanly if the balance is too low
    const debited = await User.findOneAndUpdate(
      { _id: req.user._id, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { returnDocument: 'after' }
    );
    if (!debited) return res.status(400).json({ message: 'Insufficient balance' });

    const days = durationToDays(plan.duration) || 30;
    const investment = await UserInvestment.create({
      user: req.user._id,
      planName: plan.name,
      amount,
      roiPercentage: plan.roi_percentage || 0,
      duration: plan.duration,
      endDate: new Date(Date.now() + days * DAY),
    });

    await Transaction.create({
      user: req.user._id,
      amount: -amount,
      type: 'investment',
      description: `Joined ${plan.name} plan`,
      status: 'completed'
    });

    res.status(201).json({ message: 'Investment plan joined', investment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
