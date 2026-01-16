import mongoose from 'mongoose';

const emiPlanSchema = new mongoose.Schema(
  {
    months: {
      type: Number,
      required: true,
      min: 1,
    },
    interestRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    minAmount: {
      type: Number,
      default: 1000,
      min: 0,
    },
    maxAmount: {
      type: Number,
      default: 100000,
      min: 0,
    },
    processingFee: {
      type: Number,
      default: 50,
      min: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for active plans
emiPlanSchema.index({ active: 1, months: 1 });

// Helper method to calculate monthly installment
emiPlanSchema.methods.calculateInstallment = function (amount) {
  const totalWithInterest = amount * (1 + this.interestRate / 100);
  return parseFloat((totalWithInterest / this.months).toFixed(2));
};

// Helper method to calculate total amount with interest
emiPlanSchema.methods.calculateTotalAmount = function (amount) {
  return parseFloat((amount * (1 + this.interestRate / 100)).toFixed(2));
};

export default mongoose.model('EMIPlan', emiPlanSchema);
