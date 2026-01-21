import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getPackages,
  getPackageById,
  initiatePackagePurchase,
  verifyPackagePurchase,
  getPurchaseHistory,
} from '../controllers/packageController.js';

const router = express.Router();

// Public routes
router.get('/', getPackages);
router.get('/:id', getPackageById);

// Protected routes
router.post('/purchase', protect, initiatePackagePurchase);
router.post('/purchase/verify', protect, verifyPackagePurchase);
router.get('/purchase/history', protect, getPurchaseHistory);

export default router;
