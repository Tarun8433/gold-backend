import mongoose from 'mongoose';

const billItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  },
  name: {
    type: String,
    required: true,
  },
  description: String,
  hsnCode: {
    type: String,
    default: '7113', // Default HSN for jewellery
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  unitPrice: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  taxableAmount: {
    type: Number,
    required: true,
  },
  cgstRate: {
    type: Number,
    default: 1.5,
  },
  cgstAmount: {
    type: Number,
    default: 0,
  },
  sgstRate: {
    type: Number,
    default: 1.5,
  },
  sgstAmount: {
    type: Number,
    default: 0,
  },
  igstRate: {
    type: Number,
    default: 0,
  },
  igstAmount: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
});

const billSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
    },
    billingType: {
      type: String,
      enum: ['with_gst', 'without_gst'],
      default: 'with_gst',
    },

    // Business Details
    businessName: {
      type: String,
      required: true,
    },
    businessAddress: {
      type: String,
      required: true,
    },
    businessPhone: String,
    businessEmail: String,
    businessGSTIN: String,

    // Customer Details
    customerName: {
      type: String,
      required: true,
    },
    customerPhone: String,
    customerEmail: String,
    customerGSTIN: String,
    billingAddress: {
      type: String,
      required: true,
    },
    shippingAddress: String,

    // Items
    items: [billItemSchema],

    // Totals
    subtotal: {
      type: Number,
      required: true,
    },
    totalDiscount: {
      type: Number,
      default: 0,
    },
    taxableAmount: {
      type: Number,
      required: true,
    },
    totalCGST: {
      type: Number,
      default: 0,
    },
    totalSGST: {
      type: Number,
      default: 0,
    },
    totalIGST: {
      type: Number,
      default: 0,
    },
    totalTax: {
      type: Number,
      default: 0,
    },
    roundOff: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
    },
    amountInWords: String,

    // Payment Info
    paymentMethod: String,
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending', 'partial'],
      default: 'paid',
    },

    // Status
    status: {
      type: String,
      enum: ['draft', 'generated', 'sent', 'cancelled'],
      default: 'generated',
    },

    // PDF
    pdfUrl: String,

    // Notes
    notes: String,
    termsAndConditions: [String],

    // Metadata
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    sentAt: Date,
    cancelledAt: Date,
    cancelReason: String,
  },
  {
    timestamps: true,
  }
);

// Generate invoice number
billSchema.statics.generateInvoiceNumber = async function () {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  // Find the last invoice of this year
  const lastBill = await this.findOne({
    invoiceNumber: { $regex: `^${prefix}` },
  }).sort({ invoiceNumber: -1 });

  let nextNumber = 1;
  if (lastBill) {
    const lastNumber = parseInt(lastBill.invoiceNumber.split('-').pop(), 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(5, '0')}`;
};

// Convert number to words (Indian format)
billSchema.statics.numberToWords = function (num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const numToWords = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + numToWords(n % 100) : '');
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + numToWords(n % 1000) : '');
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + numToWords(n % 100000) : '');
    return numToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + numToWords(n % 10000000) : '');
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let result = numToWords(rupees) + ' Rupees';
  if (paise > 0) {
    result += ' and ' + numToWords(paise) + ' Paise';
  }
  result += ' Only';

  return result;
};

// Index for faster lookups
billSchema.index({ order: 1 });
billSchema.index({ invoiceNumber: 1 });
billSchema.index({ createdAt: -1 });

const Bill = mongoose.model('Bill', billSchema);

export default Bill;
