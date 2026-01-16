import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: 0,
    },
    makingChargesPercent: {
      type: Number,
      min: 0,
      max: 100,
    },
    makingCharges: {
      type: Number,
      default: 0,
      min: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
    },
    images: [
      {
        type: String,
        required: true,
      },
    ],
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
    },
    material: {
      type: String,
      enum: ['Gold', 'Silver', 'Platinum', 'Diamond', 'Pearl', 'Gemstone', 'Mixed'],
    },
    weight: {
      type: Number, // in grams
    },
    sizes: [
      {
        type: String, // e.g., "6.0", "7.5", "One Size"
      },
    ],
    variantType: {
      type: String,
      enum: ['size', 'color'],
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    reviews: [ReviewSchema],
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
    },
    isBestSeller: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
      },
    ],
    soldCount: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });

// Index for filtering and sorting
ProductSchema.index({ category: 1, price: 1, rating: -1, createdAt: -1 });
ProductSchema.index({ isFeatured: 1, isNewArrival: 1, isBestSeller: 1 });

export default mongoose.model('Product', ProductSchema);
