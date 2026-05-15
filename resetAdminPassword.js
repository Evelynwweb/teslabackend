require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const newHash = await bcrypt.hash('admin123', 10);
  const result = await User.updateOne(
    { email: 'admin@example.com' },
    { $set: { password: newHash } }
  );
  if (result.modifiedCount) {
    console.log('✅ Admin password reset to "admin123"');
  } else {
    console.log('❌ Admin user not found');
  }
  process.exit();
});