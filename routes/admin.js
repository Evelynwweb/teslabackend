const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { admin } = require('../middleware/admin');
const adminCtrl = require('../controllers/adminController');
const settingsCtrl = require('../controllers/settingsController');

router.post('/login', adminCtrl.login);

// All routes below require admin role
router.use(protect, admin);
router.get('/stats', adminCtrl.getStats);
router.get('/users', adminCtrl.getUsers);
router.put('/users/:id/status', adminCtrl.updateUserStatus);
router.delete('/users/:id', adminCtrl.deleteUser);
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
router.get('/payment-settings', settingsCtrl.getPaymentSettings);
router.put('/payment-settings', settingsCtrl.updatePaymentSettings);

router.get('/users/:id', adminCtrl.getUserById);
router.put('/users/:id', adminCtrl.updateUser);
router.post('/users/:id/balance', adminCtrl.adjustUserBalance);

// Stock management
router.get('/stocks', adminCtrl.getStocksAdmin);
router.post('/stocks', adminCtrl.createStock);
router.put('/stocks/:id', adminCtrl.updateStock);
router.delete('/stocks/:id', adminCtrl.deleteStock);

router.get('/stock-investments', adminCtrl.getStockInvestments);
router.put('/stock-investments/:id', adminCtrl.updateStockInvestmentStatus);
router.delete('/stock-investments/:id', adminCtrl.deleteStockInvestment);

router.get('/user-investments', adminCtrl.getUserInvestments);
router.put('/user-investments/:id', adminCtrl.updateUserInvestment);
router.delete('/user-investments/:id', adminCtrl.deleteUserInvestment);

router.post('/stock-investments/:id/add-profit', adminCtrl.addStockInvestmentProfit);
router.post('/plan-investments/:id/add-profit', adminCtrl.addPlanInvestmentProfit);

// Support messages (admin)
router.get('/support-messages', adminCtrl.getAllMessages);
router.put('/support-messages/:id/read', adminCtrl.markAsRead);
router.post('/support-messages/:id/reply', adminCtrl.replyToMessage);
router.get('/support-unread-count', adminCtrl.getUnreadCount);

module.exports = router;