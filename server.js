require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));
app.use(express.json());

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

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch(err => console.log(err));