const express = require('express');
const router = express.Router();
const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');
const generateToken = require('../utils/generateToken');

// Helper: generate 6-digit code
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// POST /api/pre-register - send verification code (email simulation)
router.post('/pre-register', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });
  
  const code = generateCode();
  await VerificationCode.findOneAndDelete({ email });
  await VerificationCode.create({ email, code });
  
  // In production, send email here. For now, return code for testing
  console.log(`Verification code for ${email}: ${code}`);
  res.json({ message: 'Code sent', devCode: code });
});

// POST /api/verify-code - verify the code from PreRegisterVerification
router.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ message: 'Email and code required' });
  
  const record = await VerificationCode.findOne({ email, code });
  if (!record) return res.status(400).json({ message: 'Invalid or expired code' });
  
  await VerificationCode.deleteOne({ _id: record._id });
  const tempToken = Buffer.from(`${email}:${Date.now()}`).toString('base64');
  res.json({ message: 'Code verified', tempToken, redirectTo: '/register' });
});

// POST /api/register - create new user (from Register.jsx)
router.post('/register', async (req, res) => {
  const { username, name, email, phone, password, country, ref_by } = req.body;
  
  const userExists = await User.findOne({ $or: [{ email }, { username }] });
  if (userExists) return res.status(400).json({ message: 'User already exists' });
  
  const user = await User.create({
    username, name, email, phone, password, country,
    ref_by: ref_by || null
  });
  
  // If referral exists, add bonus (optional)
  if (ref_by) {
    const referrer = await User.findOne({ username: ref_by });
    if (referrer) {
      referrer.bonus += 10; // example bonus
      await referrer.save();
    }
  }
  
  const token = generateToken(user._id);
  res.status(201).json({
    _id: user._id,
    username: user.username,
    name: user.name,
    email: user.email,
    balance: user.balance,
    bonus: user.bonus,
    token
  });
});

// POST /api/login - authenticate user (from Login.jsx)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ $or: [{ email }, { username: email }] });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = generateToken(user._id);
  res.json({
    _id: user._id,
    username: user.username,
    name: user.name,
    email: user.email,
    balance: user.balance,
    bonus: user.bonus,
    profit: user.profit,
    token
  });
});

module.exports = router;