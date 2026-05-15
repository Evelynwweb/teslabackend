const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');
const adminCtrl = require('../controllers/adminController');

router.post('/login', adminCtrl.login);

// All routes below require admin role
router.use(protect, admin);
router.get('/stats', adminCtrl.getStats);
router.get('/users', adminCtrl.getUsers);
router.put('/users/:id/status', adminCtrl.updateUserStatus);
router.get('/plans', adminCtrl.getPlans);
router.post('/plans', adminCtrl.createPlan);
router.put('/plans/:id', adminCtrl.updatePlan);
router.delete('/plans/:id', adminCtrl.deletePlan);
router.get('/deposits', adminCtrl.getDeposits);
router.put('/deposits/:id/approve', adminCtrl.approveDeposit);
router.put('/deposits/:id/reject', adminCtrl.rejectDeposit);
router.get('/withdrawals', adminCtrl.getWithdrawals);
router.put('/withdrawals/:id/approve', adminCtrl.approveWithdrawal);
router.put('/withdrawals/:id/reject', adminCtrl.rejectWithdrawal);

module.exports = router;