import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  syncCart,
  isProductInCart,
  validateCartForCheckout,
  getCheckoutPriceBreakdown,
} from '../controllers/cartController.js';

const router = express.Router();

router.route('/')
  .get(protect, getCart)
  .post(protect, addToCart)
  .delete(protect, clearCart);

router.get('/status/:productId', protect, isProductInCart);

router.route('/sync')
  .post(protect, syncCart);

router.post('/validate-checkout', protect, validateCartForCheckout);
router.get('/checkout-breakdown', protect, getCheckoutPriceBreakdown);

router.route('/:itemId')
  .put(protect, updateCartItem)
  .delete(protect, removeCartItem);

export default router;
