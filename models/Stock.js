const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  stockId: { type: Number, required: true, unique: true },
  name: String,
  symbol: String,
  min: Number,
  max: Number,
  duration: String,
});

module.exports = mongoose.model('Stock', stockSchema);