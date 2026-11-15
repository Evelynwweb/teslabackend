const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getMe, updateProfile, updateWithdrawalSettings, changePassword, updatePreferences } = require('../controllers/userController');

router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/withdrawal-settings', protect, updateWithdrawalSettings);
router.put('/password', protect, changePassword);
router.put('/preferences', protect, updatePreferences);

module.exports = router;
