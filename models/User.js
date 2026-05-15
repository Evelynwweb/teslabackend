const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  country: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  ref_by: { type: String, default: null },
  balance: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  totalDeposited: { type: Number, default: 0 },
  totalWithdrawn: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  // Inside userSchema, add:
withdrawalSettings: {
  bank_name: { type: String, default: '' },
  account_name: { type: String, default: '' },
  account_no: { type: String, default: '' },
  swiftcode: { type: String, default: '' },
  btc_address: { type: String, default: '' },
  eth_address: { type: String, default: '' },
  ltc_address: { type: String, default: '' },
  usdt_address: { type: String, default: '' }
},
preferences: {
  otpsend: { type: String, enum: ['Yes', 'No'], default: 'No' },
  roiemail: { type: String, enum: ['Yes', 'No'], default: 'Yes' },
  invplanemail: { type: String, enum: ['Yes', 'No'], default: 'Yes' }
}
});

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);