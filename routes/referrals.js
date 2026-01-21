import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getReferralCode,
  getReferralHistory,
  getReferralStats,
  applyReferralCode,
  validateReferralCode,
} from '../controllers/referralController.js';

const router = express.Router();

// Public routes
router.get('/validate/:code', validateReferralCode);

// Protected routes
router.get('/code', protect, getReferralCode);
router.get('/history', protect, getReferralHistory);
router.get('/stats', protect, getReferralStats);
router.post('/apply', protect, applyReferralCode);

export default router;
