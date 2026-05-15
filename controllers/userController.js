const User = require('../models/User');
const bcrypt = require('bcryptjs');

// PUT /api/users/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, dob, address } = req.body;
    const user = await User.findById(req.user._id);
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (dob) user.dob = dob;
    if (address) user.address = address;
    await user.save();
    res.json({ message: 'Profile updated', user: { name: user.name, phone: user.phone, dob: user.dob, address: user.address } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/users/withdrawal-settings
exports.updateWithdrawalSettings = async (req, res) => {
  try {
    const { bank_name, account_name, account_no, swiftcode, btc_address, eth_address, ltc_address, usdt_address } = req.body;
    const user = await User.findById(req.user._id);
    user.withdrawalSettings = { bank_name, account_name, account_no, swiftcode, btc_address, eth_address, ltc_address, usdt_address };
    await user.save();
    res.json({ message: 'Withdrawal settings saved', withdrawalSettings: user.withdrawalSettings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/users/password
exports.changePassword = async (req, res) => {
  try {
    const { current_password, password, password_confirmation } = req.body;
    const user = await User.findById(req.user._id);
    const isMatch = await user.matchPassword(current_password);
    if (!isMatch) return res.status(401).json({ message: 'Current password incorrect' });
    if (password !== password_confirmation) return res.status(400).json({ message: 'New passwords do not match' });
    user.password = password;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/users/preferences
exports.updatePreferences = async (req, res) => {
  try {
    const { otpsend, roiemail, invplanemail } = req.body;
    const user = await User.findById(req.user._id);
    user.preferences = { otpsend, roiemail, invplanemail };
    await user.save();
    res.json({ message: 'Preferences saved', preferences: user.preferences });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};