require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// CORS – add your Vercel frontend URL too (update after deployment)
app.use(cors({
  origin: true,                // reflects the request origin
  credentials: true,
}));
app.use(express.json());

// ✅ Add a root route so Vercel doesn't show "Cannot GET /"
app.get('/', (req, res) => {
  res.json({ message: 'Tesla Dashboard API is running' });
});

// Routes
app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/dashboard'));
app.use('/api', require('./routes/deposits'));
app.use('/api', require('./routes/paymentMethods'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/trading', require('./routes/tradingRoutes'));
app.use('/api/withdrawals', require('./routes/withdrawalRoutes'));
app.use('/api/investments', require('./routes/investmentRoutes'));
app.use('/api/bots', require('./routes/botRoutes'));
app.use('/api/stocks', require('./routes/stockRoutes'));
app.use('/api/investment-plans', require('./routes/investmentPlanRoutes'));
app.use('/api/copy-trade', require('./routes/copyTradeRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/tracking', require('./routes/tracking'));


// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

  app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// ✅ Export for Vercel (serverless)
module.exports = app;

// ✅ Only listen if NOT on Vercel (local dev)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}