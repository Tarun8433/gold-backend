import express from 'express';
import {
  getBillByOrder,
  getBillById,
  downloadBill,
} from '../controllers/billController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Protected routes (for customers)
router.get('/order/:orderId', protect, getBillByOrder);
router.get('/:id', protect, getBillById);
router.get('/:id/download', protect, downloadBill);

export default router;
