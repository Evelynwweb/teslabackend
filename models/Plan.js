const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: String,
  min_amount: Number,
  max_amount: Number,
  duration: String,      // e.g., "14 Days"
  roi_percentage: Number,
  status: { type: String, default: 'active' }
});

module.exports = mongoose.model('Plan', planSchema);