import express from 'express';
import { protect } from '../middleware/auth.js';
import { getMembershipStatus } from '../controllers/settingsController.js';

const router = express.Router();

// Protected routes
router.get('/', protect, getMembershipStatus);

export default router;
