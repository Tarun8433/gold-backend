import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getOrders,
  getOrderById,
  createOrder,
  cancelOrder,
  trackOrder,
} from '../controllers/ordersController.js';

const router = express.Router();

router
  .route('/')
  .get(protect, getOrders)
  .post(protect, createOrder);

router.route('/:id').get(protect, getOrderById);

router.route('/:id/cancel').put(protect, cancelOrder);

router.route('/:id/track').get(protect, trackOrder);

export default router;

