require('dotenv').config();
const mongoose = require('mongoose');
const Stock = require('./models/Stock');

const stocks = [
  { stockId: 26, name: 'COCA-COLA', symbol: 'NYSE:KO', min: 5000, max: 1000000, duration: '12 Months' },
  { stockId: 27, name: 'SHOPIFY INC', symbol: 'NYSE:SHOP', min: 3000, max: 10000000, duration: '12 Months' },
  { stockId: 28, name: 'TESLA, INC', symbol: 'NASDAQ:TSLA', min: 5000, max: 10000000, duration: '6 Months' },
  { stockId: 29, name: 'META PLATFORMS, INC', symbol: 'NASDAQ:META', min: 3000, max: 10000000, duration: '12 Months' },
  { stockId: 30, name: 'AMAZON.COM INC.', symbol: 'NASDAQ:AMZN', min: 3000, max: 10000000, duration: '6 Months' },
  { stockId: 35, name: 'NETFLIX', symbol: 'NASDAQ:NFLX', min: 3000, max: 10000000, duration: '6 Months' },
  { stockId: 36, name: 'AAPL', symbol: 'NASDAQ:AAPL', min: 100, max: 10000000, duration: '6 Months' },
];

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    await Stock.deleteMany({});
    await Stock.insertMany(stocks);
    console.log('Stocks seeded');
    process.exit();
  })
  .catch(err => { console.error(err); process.exit(1); });