import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getVouchers,
  applyVoucher,
  getVoucherByCode,
  getMyVouchers,
  seedVouchers,
} from '../controllers/vouchersController.js';

const router = express.Router();

router.get('/', protect, getVouchers);

router.post('/seed', protect, seedVouchers);

router.post('/apply', protect, applyVoucher);

router.get('/my-vouchers', protect, getMyVouchers);

router.get('/:code', protect, getVoucherByCode);

export default router;
