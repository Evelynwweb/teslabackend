// seedTracking.js - run once to populate MongoDB with sample tracking
require('dotenv').config();
const mongoose = require('mongoose');
const Tracking = require('./models/Tracking');

const seedData = [
  {
    trackingNumber: 'TSLA-2025-001',
    orderId: 'ORD-2025-001',            // Added for Parcel Info
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
    customerPhone: '+1 (555) 111-2222', // Added for Receiver Info
    vehicle: {
      model: 'Model 3',
      vin: '5YJ3E1EA7MF123456',
      color: 'Pearl White',
      trim: 'Long Range'
    },
    status: 'In Production',
    estimatedDelivery: new Date('2025-06-15'),
    // Added for Shipment Details
    weight: '4,500 lbs',
    dimensions: '16ft x 6ft x 5ft',
    carrier: 'Tesla Logistics',
    mode: 'Ground / Rail',
    history: [
      { status: 'Order Placed', timestamp: new Date('2025-04-01'), note: 'Order confirmed' },
      { status: 'In Production', timestamp: new Date('2025-04-10'), note: 'Vehicle entered production line' }
    ],
    currentLocation: {
      city: 'Fremont',
      state: 'CA',
      country: 'USA'
    }
  },
  {
    trackingNumber: 'TSLA-2025-002',
    orderId: 'ORD-2025-002',            // Added for Parcel Info
    customerName: 'Jane Smith',
    customerEmail: 'jane@example.com',
    customerPhone: '+1 (555) 222-3333', // Added for Receiver Info
    vehicle: {
      model: 'Cybertruck',
      vin: '7SAYGDEE8RF123456',
      color: 'Stainless Steel',
      trim: 'Cyberbeast'
    },
    status: 'In Transit',
    estimatedDelivery: new Date('2025-06-01'),
    // Added for Shipment Details
    weight: '6,200 lbs',
    dimensions: '18ft x 7ft x 6ft',
    carrier: 'Tesla Logistics',
    mode: 'Ground / Rail',
    history: [
      { status: 'Order Placed', timestamp: new Date('2025-03-15'), note: 'Order confirmed' },
      { status: 'In Production', timestamp: new Date('2025-04-01'), note: 'Production started' },
      { status: 'Quality Check', timestamp: new Date('2025-04-20'), note: 'All checks passed' },
      { status: 'Shipped', timestamp: new Date('2025-05-01'), note: 'Vehicle shipped from factory' },
      { status: 'In Transit', timestamp: new Date('2025-05-05'), note: 'En route to delivery center' }
    ],
    currentLocation: {
      city: 'Denver',
      state: 'CO',
      country: 'USA'
    }
  }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    await Tracking.deleteMany({}); // Clear old data
    await Tracking.insertMany(seedData);
    console.log('Seed data inserted successfully');
    console.log('----------------------------------------------');
    console.log('✅ Test tracking numbers:');
    console.log('   TSLA-2025-001 (In Production - Model 3)');
    console.log('   TSLA-2025-002 (In Transit - Cybertruck)');
    console.log('----------------------------------------------');
    
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedDatabase();