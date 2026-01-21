import mongoose from 'mongoose';

const PackagePurchaseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    package: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
      required: true,
    },
    amountPaid: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative'],
    },
    loyaltyPointsUsed: {
      type: Number,
      default: 0,
      min: [0, 'Points cannot be negative'],
    },
    paymentId: {
      type: String,
    },
    razorpayOrderId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
    paymentMethod: {
      type: String,
      enum: ['online', 'cash', 'wallet'],
      default: 'online',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    membershipGranted: {
      status: {
        type: Boolean,
        default: false,
      },
      grantedAt: {
        type: Date,
      },
      expiresAt: {
        type: Date,
      },
      discountPercent: {
        type: Number,
      },
    },
    referralRewarded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

PackagePurchaseSchema.index({ user: 1, createdAt: -1 });
PackagePurchaseSchema.index({ paymentStatus: 1 });
PackagePurchaseSchema.index({ paymentId: 1 });

export default mongoose.model('PackagePurchase', PackagePurchaseSchema);
