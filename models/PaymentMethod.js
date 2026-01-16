import mongoose from 'mongoose';

const paymentMethodSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
    },
    brand: {
      type: String,
      required: true,
    },
    last4: {
      type: String,
      required: true,
    },
    expMonth: {
      type: Number,
      required: true,
    },
    expYear: {
      type: Number,
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('PaymentMethod', paymentMethodSchema);

