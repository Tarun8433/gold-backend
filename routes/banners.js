import express from 'express';
import { z } from 'zod';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import { admin } from '../middleware/admin.js';
import Banner from '../models/Banner.js';

const router = express.Router();

// Validation schema for creating a banner
const createBannerSchema = z.object({
  body: z.object({
    image: z.string().url('Invalid image URL'),
    title: z.string().min(1).optional(),
    subtitle: z.string().optional(),
    linkUrl: z.string().url('Invalid link URL').optional(),
    isActive: z.boolean().optional(),
    position: z.number().int().min(0).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

// Public: get active banners for home screen
router.get('/', async (req, res) => {
  try {
    const now = new Date();

    const banners = await Banner.find({
      isActive: true,
      $and: [
        {
          $or: [
            { startDate: { $exists: false } },
            { startDate: null },
            { startDate: { $lte: now } },
          ],
        },
        {
          $or: [
            { endDate: { $exists: false } },
            { endDate: null },
            { endDate: { $gte: now } },
          ],
        },
      ],
    })
      .sort({ position: 1, createdAt: -1 })
      .lean();

    res.json(banners);
  } catch (error) {
    console.error('Get banners error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// Admin: create a new banner
router.post('/', protect, admin, validate(createBannerSchema), async (req, res) => {
  try {
    const {
      image,
      title,
      subtitle,
      linkUrl,
      isActive,
      position,
      startDate,
      endDate,
    } = req.body;

    const banner = await Banner.create({
      image,
      title,
      subtitle,
      linkUrl,
      isActive: isActive !== undefined ? isActive : true,
      position: position ?? 0,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    res.status(201).json(banner);
  } catch (error) {
    console.error('Create banner error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

export default router;

