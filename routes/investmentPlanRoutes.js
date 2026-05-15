const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getPlans, joinPlan } = require('../controllers/investmentPlanController');

router.get('/', protect, getPlans);  
router.post('/join', protect, joinPlan);

module.exports = router;