const express = require('express');
const router = express.Router();
const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');
const generateToken = require('../utils/generateToken');
const { getGeneralSettings } = require('../utils/siteSettings');
const emailjs = require('@emailjs/nodejs');

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendEmailJS = async (templateID, templateParams) => {
  try {
    const response = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      templateID,
      templateParams,
      { publicKey: process.env.EMAILJS_PUBLIC_KEY,
        privateKey: process.env.EMAILJS_PRIVATE_KEY }
    );
    console.log('Email sent successfully:', response.status);
    return response;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

router.post('/pre-register', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });
  
  const code = generateCode();
  await VerificationCode.findOneAndDelete({ email });
  await VerificationCode.create({ email, code });
  
  console.log(`Verification code for ${email}: ${code}`);
  res.json({ message: 'Code sent', devCode: code });
});

router.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ message: 'Email and code required' });
  
  const record = await VerificationCode.findOne({ email, code });
  if (!record) return res.status(400).json({ message: 'Invalid or expired code' });
  
  await VerificationCode.deleteOne({ _id: record._id });
  const tempToken = Buffer.from(`${email}:${Date.now()}`).toString('base64');
  res.json({ message: 'Code verified', tempToken, redirectTo: '/register' });
});

router.post('/register', async (req, res) => {
  const { username, name, email, phone, password, country, ref_by } = req.body;

  const settings = await getGeneralSettings();
  if (!settings.registrationEnabled) {
    return res.status(403).json({ message: 'New registrations are currently closed.' });
  }
  
  const userExists = await User.findOne({ $or: [{ email }, { username }] });
  if (userExists) return res.status(400).json({ message: 'User already exists' });
  
  const user = await User.create({
    username, name, email, phone, password, country,
    ref_by: ref_by || null
  });
  
  if (ref_by) {
    const referrer = await User.findOne({ username: ref_by });
    if (referrer) {
      referrer.bonus += 10;
      await referrer.save();
    }
  }
  
  const token = generateToken(user._id);

  // ✅ WELCOME EMAIL (template_l1513bn)
  (async () => {
    try {
      await sendEmailJS(process.env.EMAILJS_TEMPLATE_WELCOME, {
        username: user.username,
        name: user.name,
        email: user.email
      });
    } catch (error) {
      console.error("Welcome Email failed:", error.message);
    }
  })();

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

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  // email and username are stored lowercase, so match case-insensitively
  const login = String(email || '').trim().toLowerCase();
  if (!login || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  const user = await User.findOne({ $or: [{ email: login }, { username: login }] });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  if (user.isActive === false) {
    return res.status(403).json({ message: 'Your account has been suspended. Please contact support.' });
  }
  const token = generateToken(user._id);

  // ✅ LOGIN ALERT EMAIL (template_foq3h6k)
(async () => {
  try {
    await sendEmailJS(process.env.EMAILJS_TEMPLATE_LOGIN, {
      name: user.name,
      username: user.username,
      email: user.email,
      subject: "New Login Alert",
      message: `We detected a successful login to your Tesla Dashboard account at ${new Date().toLocaleString()}.`
    });
  } catch (error) {
    console.error("Login Alert Email failed:", error); 
  }
})();

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