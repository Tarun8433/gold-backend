import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const AddressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
    },
    fullName: {
      type: String,
    },
    phone: {
      type: String,
    },
    addressLine1: {
      type: String,
    },
    addressLine2: {
      type: String,
    },
    city: {
      type: String,
    },
    state: {
      type: String,
    },
    postalCode: {
      type: String,
    },
    country: {
      type: String,
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

const PaymentSettingsSchema = new mongoose.Schema(
  {
    emiEnabled: {
      type: Boolean,
      default: false,
    },
    partialPaymentEnabled: {
      type: Boolean,
      default: false,
    },
    allowedEmiTenures: {
      type: [Number],
      default: [], // e.g., [3, 6, 9, 12, 18, 24]
    },
    minPartialPaymentPercent: {
      type: Number,
      default: 10,
      min: 1,
      max: 99,
    },
    maxPartialPaymentPercent: {
      type: Number,
      default: 90,
      min: 1,
      max: 99,
    },
    canConvertPartialToEmi: {
      type: Boolean,
      default: false,
    },
    creditLimit: {
      type: Number,
      default: 0, // 0 means no credit limit set
    },
    trustScore: {
      type: Number,
      default: 0, // Admin can set trust score (0-100)
      min: 0,
      max: 100,
    },
    notes: {
      type: String, // Admin notes about customer
    },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    sparse: true,
    unique: true,
  },
  phone: {
    type: String,
    sparse: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
  },
  address: {
    type: String,
  },
  addresses: [AddressSchema],
  date: {
    type: Date,
    default: Date.now,
  },
  isAdmin: {
    type: Boolean,
    required: true,
    default: false,
  },
  paymentSettings: {
    type: PaymentSettingsSchema,
    default: () => ({}),
  },
});

// Validate that at least email or phone is provided
UserSchema.pre('validate', function() {
  if (!this.email && !this.phone) {
    this.invalidate('email', 'Either email or phone is required');
  }
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', UserSchema);
