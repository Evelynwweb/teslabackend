const express = require('express');
const router = express.Router();
const Tracking = require('../models/Tracking');

// GET tracking by number
router.get('/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    
    const tracking = await Tracking.findOne({ trackingNumber });
    
    if (!tracking) {
      return res.status(404).json({ 
        error: 'Tracking number not found',
        message: 'Please check your tracking number and try again.' 
      });
    }
    
    res.json(tracking);
  } catch (error) {
    console.error('Tracking fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST to create a new tracking entry (for admin)
router.post('/', async (req, res) => {
  try {
    const tracking = new Tracking(req.body);
    await tracking.save();
    res.status(201).json(tracking);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;