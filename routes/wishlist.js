import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from '../controllers/wishlistController.js';

const router = express.Router();

router
  .route('/')
  .get(protect, getWishlist)
  .post(protect, addToWishlist);

router.delete('/:productId', protect, removeFromWishlist);

export default router;

