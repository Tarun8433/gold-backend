import express from 'express';
import { z } from 'zod';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
} from '../controllers/authController.js';

const router = express.Router();

// Validation Schemas
const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().min(10, 'Phone number must be at least 10 characters').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }).refine(data => data.email || data.phone, {
    message: 'Either email or phone is required',
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().optional(),
    password: z.string().min(1, 'Password is required'),
  }).refine(data => data.email || data.phone, {
    message: 'Either email or phone is required',
  }),
});

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().min(10, 'Phone number must be at least 10 characters').optional(),
    avatar: z.string().optional(),
    address: z.string().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  }),
});

// Routes
router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, validate(updateProfileSchema), updateUserProfile);

export default router;
