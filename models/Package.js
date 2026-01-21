import mongoose from 'mongoose';

const PackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Package name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Package description is required'],
    },
    price: {
      type: Number,
      required: [true, 'Package price is required'],
      min: [0, 'Price cannot be negative'],
    },
    originalPrice: {
      type: Number,
      min: [0, 'Original price cannot be negative'],
    },
    membershipDurationDays: {
      type: Number,
      default: 365,
      min: [1, 'Duration must be at least 1 day'],
    },
    savingsText: {
      type: String,
    },
    benefits: [{
      type: String,
    }],
    discountPercent: {
      type: Number,
      default: 20,
      min: [0, 'Discount cannot be negative'],
      max: [100, 'Discount cannot exceed 100%'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    image: {
      type: String,
    },
    badge: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

PackageSchema.index({ isActive: 1, displayOrder: 1 });

export default mongoose.model('Package', PackageSchema);
