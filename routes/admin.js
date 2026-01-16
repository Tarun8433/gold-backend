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

export default router;

