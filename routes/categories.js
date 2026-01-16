import express from 'express';
import { z } from 'zod';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import { admin } from '../middleware/admin.js';
import {
  getCategories,
  getCategoryById,
  getCategoryProducts,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoriesController.js';

const router = express.Router();

// Validation Schemas
const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Category name is required'),
    description: z.string().optional(),
    image: z.string().url('Invalid image URL').optional(),
    makingChargesMin: z.number().min(0).optional(),
    makingChargesMax: z.number().min(0).optional(),
    makingChargesPercentDefault: z.number().min(0).max(100).optional(),
    makingChargesPercentByMaterial: z
      .record(
        z.enum([
          'Gold',
          'Silver',
          'Platinum',
          'Diamond',
          'Pearl',
          'Gemstone',
          'Mixed',
        ]),
        z.number().min(0).max(100)
      )
      .optional(),
  }),
});

const updateCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    image: z.string().url().optional(),
    makingChargesMin: z.number().min(0).optional(),
    makingChargesMax: z.number().min(0).optional(),
    makingChargesPercentDefault: z.number().min(0).max(100).optional(),
    makingChargesPercentByMaterial: z
      .record(
        z.enum([
          'Gold',
          'Silver',
          'Platinum',
          'Diamond',
          'Pearl',
          'Gemstone',
          'Mixed',
        ]),
        z.number().min(0).max(100)
      )
      .optional(),
  }),
});

// Routes
router.route('/')
  .get(getCategories)
  .post(protect, admin, validate(createCategorySchema), createCategory);

router.route('/:id')
  .get(getCategoryById)
  .put(protect, admin, validate(updateCategorySchema), updateCategory)
  .delete(protect, admin, deleteCategory);

router.route('/:id/products')
  .get(getCategoryProducts);

export default router;
