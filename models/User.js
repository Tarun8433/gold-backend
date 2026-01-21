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

const MembershipSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['inactive', 'active', 'expired'],
      default: 'inactive',
    },
    activatedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
    discountPercent: {
      type: Number,
      default: 20,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Package',
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
  membership: {
    type: MembershipSchema,
    default: () => ({ status: 'inactive' }),
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  referredByCode: {
    type: String,
  },
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: 0,
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

// Generate unique referral code
UserSchema.methods.generateReferralCode = async function () {
  if (this.referralCode) {
    return this.referralCode;
  }

  const namePart = this.name
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 3)
    .toUpperCase();

  let code;
  let isUnique = false;

  while (!isUnique) {
    const randomHex = Math.random().toString(16).substring(2, 7).toUpperCase();
    code = `${namePart}${randomHex}`.substring(0, 8);

    const existing = await mongoose.model('User').findOne({ referralCode: code });
    if (!existing) {
      isUnique = true;
    }
  }

  this.referralCode = code;
  await this.save();
  return code;
};

// Check if membership is active
UserSchema.methods.isMembershipActive = function () {
  if (!this.membership || this.membership.status !== 'active') {
    return false;
  }
  if (this.membership.expiresAt && new Date() > this.membership.expiresAt) {
    return false;
  }
  return true;
};

// Get membership discount
UserSchema.methods.getMembershipDiscount = function () {
  if (!this.isMembershipActive()) {
    return 0;
  }
  return this.membership.discountPercent || 20;
};

// Update membership status based on expiry
UserSchema.methods.updateMembershipStatus = async function () {
  if (this.membership && this.membership.status === 'active') {
    if (this.membership.expiresAt && new Date() > this.membership.expiresAt) {
      this.membership.status = 'expired';
      await this.save();
    }
  }
};

export default mongoose.model('User', UserSchema);
