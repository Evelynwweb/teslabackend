const UserInvestment = require('../models/UserInvestment');

exports.getMyInvestments = async (req, res) => {
  const investments = await UserInvestment.find({ user: req.user._id, status: 'active' })
    .sort({ startDate: -1 });
  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  res.json({ totalInvested, investments });
};