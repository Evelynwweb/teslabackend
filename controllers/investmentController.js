const UserInvestment = require('../models/UserInvestment');
const StockInvestment = require('../models/StockInvestment');

// GET /api/investments/my – active plan AND stock investments in one list.
// Stock investments are mapped onto the plan shape (planName, roiPercentage…)
// so older clients still render them; `kind` tells them apart.
exports.getMyInvestments = async (req, res) => {
  try {
    const [plans, stocks] = await Promise.all([
      UserInvestment.find({ user: req.user._id, status: 'active' }).lean(),
      StockInvestment.find({ user: req.user._id, status: 'active' }).lean(),
    ]);

    const investments = [
      ...plans.map((p) => ({ ...p, kind: 'plan' })),
      ...stocks.map((s) => ({
        _id: s._id,
        kind: 'stock',
        planName: `${s.stockName} (${s.symbol})`,
        amount: s.amount,
        roiPercentage: null,
        dailyProfitRate: s.dailyProfitRate ?? 0.5,
        profit: s.profit || 0,
        duration: s.duration,
        startDate: s.startDate,
        endDate: s.endDate,
        status: s.status,
      })),
    ].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    const totalInvested = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    res.json({ totalInvested, investments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
