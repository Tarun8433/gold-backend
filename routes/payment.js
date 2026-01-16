import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  createPaymentIntent,
  verifyPayment,
  getPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
} from '../controllers/paymentController.js';
import {
  getEMIPlans,
  seedEMIPlans,
  getAllEMIPlans,
  createEMIPlan,
  updateEMIPlan,
  deleteEMIPlan,
} from '../controllers/emiController.js';

const router = express.Router();

router.post('/intent', protect, createPaymentIntent);

router.post('/verify', protect, verifyPayment);

router
  .route('/methods')
  .get(protect, getPaymentMethods)
  .post(protect, addPaymentMethod);

router.delete('/methods/:id', protect, deletePaymentMethod);

// EMI Plans routes
router.get('/emi-plans', protect, getEMIPlans);
router.post('/emi-plans/seed', protect, seedEMIPlans);
router.get('/emi-plans/all', protect, getAllEMIPlans);
router.post('/emi-plans', protect, createEMIPlan);
router.put('/emi-plans/:id', protect, updateEMIPlan);
router.delete('/emi-plans/:id', protect, deleteEMIPlan);

export default router;

