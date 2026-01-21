import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getLoyaltyBalance,
  getLoyaltyTransactions,
  calculateLoyaltyUsage,
} from '../controllers/loyaltyController.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.get('/', getLoyaltyBalance);
router.get('/transactions', getLoyaltyTransactions);
router.post('/calculate', calculateLoyaltyUsage);

export default router;
