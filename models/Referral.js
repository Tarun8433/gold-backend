import mongoose from 'mongoose';

const ReferralSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    referee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    referralCode: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'qualified', 'rewarded', 'expired'],
      default: 'pending',
    },
    packagePurchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PackagePurchase',
    },
    rewardAmount: {
      type: Number,
      default: 0,
    },
    rewardCreditedAt: {
      type: Date,
    },
    loyaltyTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoyaltyTransaction',
    },
  },
  {
    timestamps: true,
  }
);

ReferralSchema.index({ referrer: 1, status: 1 });
ReferralSchema.index({ referee: 1 });
ReferralSchema.index({ referralCode: 1 });

export default mongoose.model('Referral', ReferralSchema);
