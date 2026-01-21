import express from 'express';
import { protect } from '../middleware/auth.js';
import { admin } from '../middleware/admin.js';
import {
  getDashboardStats,
  getAdminProducts,
  getAdminProductById,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  getAdminCategories,
  getAdminCategoryById,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
  generateOrderBill,
  getAdminVouchers,
  getAdminVoucherById,
  createAdminVoucher,
  updateAdminVoucher,
  deleteAdminVoucher,
  getAdminCustomers,
  getAdminCustomerById,
  updateCustomerPaymentSettings,
  bulkUpdatePaymentSettings,
} from '../controllers/adminController.js';
import {
  getAdminPackages,
  createPackage,
  updatePackage,
  deletePackage,
  getAdminPurchases,
} from '../controllers/packageController.js';
import { getAdminReferrals } from '../controllers/referralController.js';
import {
  getAdminLoyaltyTransactions,
  adjustLoyaltyPoints,
} from '../controllers/loyaltyController.js';
import {
  getSettings,
  getSettingByKey,
  updateSettings,
  updateSetting,
  seedSettings,
} from '../controllers/settingsController.js';
import {
  generateBill,
  getAllBills,
  cancelBill,
  regenerateBillPDF,
} from '../controllers/billController.js';

const router = express.Router();

// Dashboard
router.get('/dashboard/stats', protect, admin, getDashboardStats);

// Products
router
  .route('/products')
  .get(protect, admin, getAdminProducts)
  .post(protect, admin, createAdminProduct);

router
  .route('/products/:id')
  .get(protect, admin, getAdminProductById)
  .put(protect, admin, updateAdminProduct)
  .delete(protect, admin, deleteAdminProduct);

// Categories
router
  .route('/categories')
  .get(protect, admin, getAdminCategories)
  .post(protect, admin, createAdminCategory);

router
  .route('/categories/:id')
  .get(protect, admin, getAdminCategoryById)
  .put(protect, admin, updateAdminCategory)
  .delete(protect, admin, deleteAdminCategory);

// Orders
router
  .route('/orders')
  .get(protect, admin, getAdminOrders);

router
  .route('/orders/:id')
  .get(protect, admin, getAdminOrderById);

router.put('/orders/:id/status', protect, admin, updateOrderStatus);
router.get('/orders/:id/bill', protect, admin, generateOrderBill);

// Vouchers
router
  .route('/vouchers')
  .get(protect, admin, getAdminVouchers)
  .post(protect, admin, createAdminVoucher);

router
  .route('/vouchers/:id')
  .get(protect, admin, getAdminVoucherById)
  .put(protect, admin, updateAdminVoucher)
  .delete(protect, admin, deleteAdminVoucher);

// Customers
router
  .route('/customers')
  .get(protect, admin, getAdminCustomers);

router.put('/customers/bulk-payment-settings', protect, admin, bulkUpdatePaymentSettings);

router
  .route('/customers/:id')
  .get(protect, admin, getAdminCustomerById);

router.put('/customers/:id/payment-settings', protect, admin, updateCustomerPaymentSettings);

// Packages
router
  .route('/packages')
  .get(protect, admin, getAdminPackages)
  .post(protect, admin, createPackage);

router
  .route('/packages/:id')
  .put(protect, admin, updatePackage)
  .delete(protect, admin, deletePackage);

router.get('/packages/purchases', protect, admin, getAdminPurchases);

// Referrals
router.get('/referrals', protect, admin, getAdminReferrals);

// Loyalty
router.get('/loyalty/transactions', protect, admin, getAdminLoyaltyTransactions);
router.post('/loyalty/adjust', protect, admin, adjustLoyaltyPoints);

// Settings
router
  .route('/settings')
  .get(protect, admin, getSettings)
  .put(protect, admin, updateSettings);

router.post('/settings/seed', protect, admin, seedSettings);

router
  .route('/settings/:key')
  .get(protect, admin, getSettingByKey)
  .put(protect, admin, updateSetting);

// Bills
router.get('/bills', protect, admin, getAllBills);
router.post('/bills/generate', protect, admin, generateBill);
router.put('/bills/:id/cancel', protect, admin, cancelBill);
router.post('/bills/:id/regenerate', protect, admin, regenerateBillPDF);

export default router;

