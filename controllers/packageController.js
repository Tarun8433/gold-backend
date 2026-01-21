import Package from '../models/Package.js';
import PackagePurchase from '../models/PackagePurchase.js';
import User from '../models/User.js';
import Referral from '../models/Referral.js';
import LoyaltyTransaction from '../models/LoyaltyTransaction.js';
import AppSettings from '../models/AppSettings.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';

// Lazy initialize Razorpay (only when needed)
let razorpay = null;

const getRazorpay = () => {
  if (!razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
    }
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
};

// ============== Public Package Routes ==============

// @desc    Get all active packages
// @route   GET /api/packages
// @access  Public
const getPackages = async (req, res) => {
  try {
    const packages = await Package.find({ isActive: true })
      .sort({ displayOrder: 1, price: 1 });
    res.json(packages);
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get package by ID
// @route   GET /api/packages/:id
// @access  Public
const getPackageById = async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }
    res.json(pkg);
  } catch (error) {
    console.error('Get package error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ============== Package Purchase Routes ==============

// @desc    Initiate package purchase
// @route   POST /api/packages/purchase
// @access  Private
const initiatePackagePurchase = async (req, res) => {
  try {
    const { packageId, loyaltyPointsToUse = 0 } = req.body;
    const userId = req.user._id;

    // Get package
    const pkg = await Package.findById(packageId);
    if (!pkg || !pkg.isActive) {
      return res.status(404).json({ message: 'Package not found or inactive' });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Calculate amount
    let amountToPay = pkg.price;
    let pointsToDeduct = 0;

    // Apply loyalty points if requested
    if (loyaltyPointsToUse > 0) {
      const maxLoyaltyUsagePercent = await AppSettings.getSetting('max_loyalty_usage_percent', 50);
      const maxPoints = Math.floor((pkg.price * maxLoyaltyUsagePercent) / 100);
      const availablePoints = user.loyaltyPoints || 0;

      pointsToDeduct = Math.min(loyaltyPointsToUse, maxPoints, availablePoints);
      amountToPay = pkg.price - pointsToDeduct;
    }

    // Create Razorpay order
    const razorpayOrder = await getRazorpay().orders.create({
      amount: Math.round(amountToPay * 100), // Razorpay expects amount in paise
      currency: 'INR',
      receipt: `pkg_${Date.now()}`,
      notes: {
        packageId: pkg._id.toString(),
        userId: userId.toString(),
        loyaltyPointsUsed: pointsToDeduct,
      },
    });

    // Create pending purchase record
    const purchase = await PackagePurchase.create({
      user: userId,
      package: pkg._id,
      amountPaid: amountToPay,
      loyaltyPointsUsed: pointsToDeduct,
      razorpayOrderId: razorpayOrder.id,
      paymentMethod: 'online',
      paymentStatus: 'pending',
    });

    res.json({
      orderId: razorpayOrder.id,
      purchaseId: purchase._id,
      amount: amountToPay,
      currency: 'INR',
      packageName: pkg.name,
      loyaltyPointsUsed: pointsToDeduct,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Initiate purchase error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Verify package payment and activate membership
// @route   POST /api/packages/purchase/verify
// @access  Private
const verifyPackagePurchase = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, purchaseId } = req.body;
    const userId = req.user._id;

    // Find the purchase
    const purchase = await PackagePurchase.findOne({
      _id: purchaseId,
      user: userId,
      razorpayOrderId,
    }).populate('package');

    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    if (purchase.paymentStatus === 'completed') {
      return res.status(400).json({ message: 'Payment already verified' });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      purchase.paymentStatus = 'failed';
      await purchase.save();
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Update purchase record
    purchase.paymentId = razorpayPaymentId;
    purchase.razorpaySignature = razorpaySignature;
    purchase.paymentStatus = 'completed';

    // Calculate membership expiry
    const pkg = purchase.package;
    const durationDays = pkg.membershipDurationDays || 365;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    purchase.membershipGranted = {
      status: true,
      grantedAt: new Date(),
      expiresAt,
      discountPercent: pkg.discountPercent || 20,
    };

    await purchase.save();

    // Update user's membership and deduct loyalty points
    const user = await User.findById(userId);

    // Deduct loyalty points if used
    if (purchase.loyaltyPointsUsed > 0) {
      user.loyaltyPoints = (user.loyaltyPoints || 0) - purchase.loyaltyPointsUsed;

      // Create loyalty transaction
      await LoyaltyTransaction.create({
        user: userId,
        type: 'debit',
        points: purchase.loyaltyPointsUsed,
        balanceAfter: user.loyaltyPoints,
        source: 'package_payment',
        description: `Used for ${pkg.name} purchase`,
        referenceId: purchase._id,
        referenceType: 'PackagePurchase',
      });
    }

    // Update membership
    user.membership = {
      status: 'active',
      activatedAt: new Date(),
      expiresAt,
      discountPercent: pkg.discountPercent || 20,
      packageId: pkg._id,
    };

    await user.save();

    // Process referral reward if applicable
    await processReferralReward(user, purchase);

    res.json({
      success: true,
      message: 'Payment verified and membership activated',
      membership: user.membership,
    });
  } catch (error) {
    console.error('Verify purchase error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// Helper function to process referral reward
const processReferralReward = async (user, purchase) => {
  try {
    // Check if user was referred
    if (!user.referredBy) return;

    // Check if referral reward already given
    const existingReferral = await Referral.findOne({
      referee: user._id,
      status: 'rewarded',
    });

    if (existingReferral) return;

    // Find or create referral record
    let referral = await Referral.findOne({
      referee: user._id,
      status: 'pending',
    });

    if (!referral) {
      referral = await Referral.create({
        referrer: user.referredBy,
        referee: user._id,
        referralCode: user.referredByCode,
        status: 'pending',
      });
    }

    // Calculate reward
    const rewardPercent = await AppSettings.getSetting('referral_reward_percent', 50);
    const rewardAmount = Math.round((purchase.amountPaid * rewardPercent) / 100);

    // Credit loyalty points to referrer
    const referrer = await User.findById(user.referredBy);
    if (!referrer) return;

    const newBalance = (referrer.loyaltyPoints || 0) + rewardAmount;
    referrer.loyaltyPoints = newBalance;
    await referrer.save();

    // Create loyalty transaction for referrer
    const transaction = await LoyaltyTransaction.create({
      user: referrer._id,
      type: 'credit',
      points: rewardAmount,
      balanceAfter: newBalance,
      source: 'referral_reward',
      description: `Referral reward for ${user.name}'s package purchase`,
      referenceId: referral._id,
      referenceType: 'Referral',
    });

    // Update referral record
    referral.status = 'rewarded';
    referral.packagePurchase = purchase._id;
    referral.rewardAmount = rewardAmount;
    referral.rewardCreditedAt = new Date();
    referral.loyaltyTransactionId = transaction._id;
    await referral.save();

    // Mark purchase as referral rewarded
    purchase.referralRewarded = true;
    await purchase.save();
  } catch (error) {
    console.error('Process referral reward error:', error);
  }
};

// @desc    Get user's purchase history
// @route   GET /api/packages/purchase/history
// @access  Private
const getPurchaseHistory = async (req, res) => {
  try {
    const purchases = await PackagePurchase.find({ user: req.user._id })
      .populate('package', 'name price membershipDurationDays discountPercent')
      .sort({ createdAt: -1 });

    res.json(purchases);
  } catch (error) {
    console.error('Get purchase history error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ============== Admin Package Routes ==============

// @desc    Get all packages (admin)
// @route   GET /api/admin/packages
// @access  Private/Admin
const getAdminPackages = async (req, res) => {
  try {
    const packages = await Package.find({}).sort({ displayOrder: 1, createdAt: -1 });
    res.json(packages);
  } catch (error) {
    console.error('Admin get packages error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create package (admin)
// @route   POST /api/admin/packages
// @access  Private/Admin
const createPackage = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      originalPrice,
      membershipDurationDays,
      savingsText,
      benefits,
      discountPercent,
      isActive,
      displayOrder,
      image,
      badge,
    } = req.body;

    const pkg = await Package.create({
      name,
      description,
      price,
      originalPrice,
      membershipDurationDays: membershipDurationDays || 365,
      savingsText,
      benefits: benefits || [],
      discountPercent: discountPercent || 20,
      isActive: isActive !== undefined ? isActive : true,
      displayOrder: displayOrder || 0,
      image,
      badge,
    });

    res.status(201).json(pkg);
  } catch (error) {
    console.error('Create package error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update package (admin)
// @route   PUT /api/admin/packages/:id
// @access  Private/Admin
const updatePackage = async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }

    const fields = [
      'name', 'description', 'price', 'originalPrice', 'membershipDurationDays',
      'savingsText', 'benefits', 'discountPercent', 'isActive', 'displayOrder',
      'image', 'badge',
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        pkg[field] = req.body[field];
      }
    });

    const updatedPkg = await pkg.save();
    res.json(updatedPkg);
  } catch (error) {
    console.error('Update package error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete package (admin)
// @route   DELETE /api/admin/packages/:id
// @access  Private/Admin
const deletePackage = async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);
    if (!pkg) {
      return res.status(404).json({ message: 'Package not found' });
    }

    // Check if package has purchases
    const purchaseCount = await PackagePurchase.countDocuments({ package: pkg._id });
    if (purchaseCount > 0) {
      // Soft delete by deactivating
      pkg.isActive = false;
      await pkg.save();
      return res.json({ message: 'Package deactivated (has existing purchases)', id: req.params.id });
    }

    await pkg.deleteOne();
    res.json({ message: 'Package deleted', id: req.params.id });
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all package purchases (admin)
// @route   GET /api/admin/packages/purchases
// @access  Private/Admin
const getAdminPurchases = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) {
      filter.paymentStatus = req.query.status;
    }

    const purchases = await PackagePurchase.find(filter)
      .populate('user', 'name email phone')
      .populate('package', 'name price')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await PackagePurchase.countDocuments(filter);

    res.json({
      purchases,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error('Admin get purchases error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

export {
  // Public
  getPackages,
  getPackageById,
  // Purchase
  initiatePackagePurchase,
  verifyPackagePurchase,
  getPurchaseHistory,
  // Admin
  getAdminPackages,
  createPackage,
  updatePackage,
  deletePackage,
  getAdminPurchases,
};
