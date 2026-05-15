// // seedPlans.js
// require('dotenv').config();
// const mongoose = require('mongoose');
// const Plan = require('./models/Plan');

// const plans = [
//   { name: 'Basic Plan', min_amount: 1000, max_amount: 4999, duration: '14 Days', roi_percentage: 5, status: 'active' },
//   { name: 'Silver Plan', min_amount: 5000, max_amount: 9999, duration: '21 Days', roi_percentage: 7, status: 'active' },
//   { name: 'Gold Plan', min_amount: 10000, max_amount: 49999, duration: '30 Days', roi_percentage: 10, status: 'active' },
//   { name: 'Platinum plan', min_amount: 50000, max_amount: 100000, duration: '60 Days', roi_percentage: 15, status: 'active' },
//   { name: 'Joint Plan', min_amount: 4000, max_amount: 500000, duration: '30 Days', roi_percentage: 12, status: 'active' }
// ];

// async function seed() {
//   try {
//     await mongoose.connect(process.env.MONGO_URI);
//     console.log('Connected to MongoDB');

//     // Clear existing plans (optional – remove if you want to keep existing)
//     await Plan.deleteMany({});
//     console.log('Cleared existing plans');

//     // Insert new plans
//     const inserted = await Plan.insertMany(plans);
//     console.log(`✅ Seeded ${inserted.length} plans:`);
//     inserted.forEach(p => console.log(` - ${p.name}`));

//     process.exit(0);
//   } catch (err) {
//     console.error('❌ Seeding failed:', err);
//     process.exit(1);
//   }
// }

// seed();