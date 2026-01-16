import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  updateReview,
  deleteReview,
  markReviewHelpful,
} from '../controllers/reviewsController.js';

const router = express.Router();

router
  .route('/:id')
  .put(protect, updateReview)
  .delete(protect, deleteReview);

router.route('/:id/helpful').post(protect, markReviewHelpful);

export default router;

