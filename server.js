require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Tesla Dashboard API is running' });
});

// ─── Serverless-safe Mongo connection ────────────────────────
let connPromise = null;
async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  if (!connPromise) {
    connPromise = mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
    }).catch((err) => {
      connPromise = null;
      throw err;
    });
  }
  await connPromise;
}

// Await DB on every request (cheap once connected)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connect error:', err);
    res.status(500).json({ message: 'DB connection failed' });
  }
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
app.use('/api/user', require('./routes/userPaymentRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));

// ✅ Cron endpoint
app.use('/api/cron', require('./routes/cronRoutes'));

// Error handler
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  connectDB()
    .then(() => {
      // On Vercel the daily run comes from vercel.json "crons"; locally use node-cron
      require('./jobs/dailyProfitJob')();
      app.listen(PORT, () => console.log(`Server on ${PORT}`));
    })
    .catch((e) => console.error('Failed to start:', e));
}