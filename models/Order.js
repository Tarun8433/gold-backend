import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    image: {
      type: String,
    },
    size: {
      type: String,
    },
  },
  {
    _id: true,
    timestamps: true,
  }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    shippingAddress: {
      type: mongoose.Schema.Types.Mixed,
    },
    paymentMethod: {
      type: String,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    payment: {
      method: {
        type: String,
        enum: ['online', 'cash'],
        default: 'cash',
      },
      type: {
        type: String,
        enum: ['full', 'partial', 'emi'],
        default: 'full',
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending',
      },
      amountPaid: {
        type: Number,
        default: 0,
        min: 0,
      },
      amountToPay: {
        type: Number,
        required: true,
        min: 0,
      },
      partialAmount: {
        type: Number,
        min: 0,
      },
      remainingAmount: {
        type: Number,
        min: 0,
      },
      emiPlan: {
        planId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'EMIPlan',
        },
        months: Number,
        interestRate: Number,
        monthlyInstallment: Number,
        totalAmount: Number,
        installmentsPaid: {
          type: Number,
          default: 0,
        },
      },
    },
    tracking: {
      carrier: String,
      trackingNumber: String,
      history: [
        {
          status: String,
          location: String,
          date: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Order', orderSchema);
