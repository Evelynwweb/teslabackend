const mongoose = require('mongoose');

const TrackingSchema = new mongoose.Schema({
  trackingNumber: { type: String, required: true, unique: true, index: true },
  orderId: { type: String },                // Added
  customerName: String,
  customerEmail: String,
  customerPhone: String,                    // Added
  vehicle: {
    model: String,
    vin: String,
    color: String,
    trim: String,
  },
  status: {
    type: String,
    enum: ['Order Placed', 'In Production', 'Quality Check', 'Shipped', 'In Transit', 'Arrived at Delivery Center', 'Ready for Pickup', 'Delivered'],
    default: 'Order Placed'
  },
  estimatedDelivery: Date,
  weight: String,                           // Added
  dimensions: String,                       // Added
  carrier: String,                          // Added
  mode: String,                             // Added
  history: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String
  }],
  currentLocation: {
    city: String,
    state: String,
    country: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Tracking', TrackingSchema);