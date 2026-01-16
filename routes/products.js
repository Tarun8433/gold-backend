import express from 'express';
import { z } from 'zod';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import {
  getProductReviews,
  addProductReview,
} from '../controllers/reviewsController.js';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getFeaturedProducts,
  getNewArrivals,
  getBestSellers,
  getRecommendations,
} from '../controllers/productsController.js';

const router = express.Router();

// Validation Schemas
const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Product name is required'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    price: z.number().positive('Price must be positive'),
    originalPrice: z.number().positive().optional().nullable(),
    makingChargesPercent: z.number().min(0).max(100).optional().nullable(),
    makingCharges: z.number().min(0).optional().nullable(),
    images: z.array(z.string().url()).min(1, 'At least one image is required'),
    category: z.string().min(1, 'Category is required'),
    material: z.enum([
      'Gold',
      'Silver',
      'Platinum',
      'Diamond',
      'Pearl',
      'Gemstone',
      'Mixed',
      'Other',
    ]).optional(),
    weight: z.number().positive().optional().nullable(),
    sizes: z.array(z.string()).optional(),
    variantType: z.enum(['size', 'color']).optional(),
    stock: z.number().int().min(0, 'Stock cannot be negative'),
    isFeatured: z.boolean().optional(),
    isNewArrival: z.boolean().optional(),
    isBestSeller: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

const updateProductSchema = z.object({
  body: z.record(z.any()),
});

// Special routes (must come before /:id route)
router.get('/search', searchProducts);
router.get('/featured', getFeaturedProducts);
router.get('/new-arrivals', getNewArrivals);
router.get('/best-sellers', getBestSellers);
router.get('/recommendations', getRecommendations);

router
  .route('/:id/reviews')
  .get(getProductReviews)
  .post(protect, addProductReview);

// CRUD routes
router.route('/')
  .get(getProducts)
  .post(protect, createProduct); // TODO: Add admin middleware

router.route('/:id')
  .get(getProductById)
  .put(protect, updateProduct) // TODO: Add admin middleware
  .delete(protect, deleteProduct); // TODO: Add admin middleware

export default router;
