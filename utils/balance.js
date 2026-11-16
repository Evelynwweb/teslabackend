const User = require('../models/User');

// Parses a client-supplied amount. Returns a positive finite number or null.
const parseAmount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Atomically takes `amount` from the user's balance. Returns the updated user,
// or null if the balance is too low. (Read-modify-save could go negative under
// concurrent requests and overwrote profit credited in between.)
const debitBalance = (userId, amount) =>
  User.findOneAndUpdate(
    { _id: userId, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { returnDocument: 'after' }
  );

module.exports = { parseAmount, debitBalance };
