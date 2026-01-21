import mongoose from 'mongoose';

const LoyaltyTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },
    points: {
      type: Number,
      required: true,
      min: [0, 'Points cannot be negative'],
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    source: {
      type: String,
      enum: [
        'referral_reward',
        'cashback',
        'refund',
        'order_payment',
        'package_payment',
        'admin_adjustment',
        'welcome_bonus',
        'expired',
      ],
      required: true,
    },
    description: {
      type: String,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    referenceType: {
      type: String,
      enum: ['Order', 'Referral', 'PackagePurchase', 'Admin'],
    },
  },
  {
    timestamps: true,
  }
);

LoyaltyTransactionSchema.index({ user: 1, createdAt: -1 });
LoyaltyTransactionSchema.index({ source: 1 });

export default mongoose.model('LoyaltyTransaction', LoyaltyTransactionSchema);
