import User from '../models/User.js';
import Referral from '../models/Referral.js';
import AppSettings from '../models/AppSettings.js';

// @desc    Get or generate referral code
// @route   GET /api/referrals/code
// @access  Private
const getReferralCode = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate referral code if not exists
    const referralCode = await user.generateReferralCode();

    res.json({
      referralCode,
      shareLink: `${process.env.APP_URL || 'https://app.example.com'}/signup?ref=${referralCode}`,
    });
  } catch (error) {
    console.error('Get referral code error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get referral history
// @route   GET /api/referrals/history
// @access  Private
const getReferralHistory = async (req, res) => {
  try {
    const referrals = await Referral.find({ referrer: req.user._id })
      .populate('referee', 'name avatar createdAt')
      .populate('packagePurchase', 'amountPaid createdAt')
      .sort({ createdAt: -1 });

    res.json(referrals);
  } catch (error) {
    console.error('Get referral history error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get referral stats
// @route   GET /api/referrals/stats
// @access  Private
const getReferralStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const totalReferrals = await Referral.countDocuments({ referrer: userId });
    const pendingReferrals = await Referral.countDocuments({ referrer: userId, status: 'pending' });
    const successfulReferrals = await Referral.countDocuments({ referrer: userId, status: 'rewarded' });

    // Calculate total earned
    const rewardedReferrals = await Referral.find({ referrer: userId, status: 'rewarded' });
    const totalEarned = rewardedReferrals.reduce((sum, ref) => sum + (ref.rewardAmount || 0), 0);

    // Get reward percent setting
    const rewardPercent = await AppSettings.getSetting('referral_reward_percent', 50);

    res.json({
      totalReferrals,
      pendingReferrals,
      successfulReferrals,
      totalEarned,
      rewardPercent,
    });
  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Apply referral code (during signup or later)
// @route   POST /api/referrals/apply
// @access  Private
const applyReferralCode = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user._id;

    if (!code) {
      return res.status(400).json({ message: 'Referral code is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user already has a referrer
    if (user.referredBy) {
      return res.status(400).json({ message: 'You have already applied a referral code' });
    }

    // Find referrer by code
    const referrer = await User.findOne({ referralCode: code.toUpperCase() });
    if (!referrer) {
      return res.status(404).json({ message: 'Invalid referral code' });
    }

    // Cannot refer yourself
    if (referrer._id.toString() === userId.toString()) {
      return res.status(400).json({ message: 'Cannot use your own referral code' });
    }

    // Check referral validity days
    const validityDays = await AppSettings.getSetting('referral_validity_days', 30);
    const userCreatedAt = new Date(user.date || user.createdAt);
    const daysSinceSignup = Math.floor((Date.now() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceSignup > validityDays) {
      return res.status(400).json({
        message: `Referral code can only be applied within ${validityDays} days of signup`,
      });
    }

    // Apply referral
    user.referredBy = referrer._id;
    user.referredByCode = code.toUpperCase();
    await user.save();

    // Create pending referral record
    await Referral.create({
      referrer: referrer._id,
      referee: userId,
      referralCode: code.toUpperCase(),
      status: 'pending',
    });

    res.json({
      success: true,
      message: 'Referral code applied successfully. Reward will be credited when you purchase a package.',
      referrerName: referrer.name,
    });
  } catch (error) {
    console.error('Apply referral code error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Validate referral code (public)
// @route   GET /api/referrals/validate/:code
// @access  Public
const validateReferralCode = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({ valid: false, message: 'Code is required' });
    }

    const referrer = await User.findOne({ referralCode: code.toUpperCase() });
    if (!referrer) {
      return res.json({ valid: false, message: 'Invalid referral code' });
    }

    res.json({
      valid: true,
      referrerName: referrer.name.split(' ')[0], // First name only for privacy
    });
  } catch (error) {
    console.error('Validate referral code error:', error);
    res.status(500).json({ valid: false, message: 'Server Error' });
  }
};

// ============== Admin Referral Routes ==============

// @desc    Get all referrals (admin)
// @route   GET /api/admin/referrals
// @access  Private/Admin
const getAdminReferrals = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const referrals = await Referral.find(filter)
      .populate('referrer', 'name email phone')
      .populate('referee', 'name email phone')
      .populate('packagePurchase', 'amountPaid')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Referral.countDocuments(filter);

    // Get stats
    const totalReferred = await Referral.countDocuments({});
    const totalRewarded = await Referral.countDocuments({ status: 'rewarded' });
    const rewardedReferrals = await Referral.find({ status: 'rewarded' });
    const totalRewardsPaid = rewardedReferrals.reduce((sum, r) => sum + (r.rewardAmount || 0), 0);

    res.json({
      referrals,
      page,
      pages: Math.ceil(total / limit),
      total,
      stats: {
        totalReferred,
        totalRewarded,
        conversionRate: totalReferred > 0 ? ((totalRewarded / totalReferred) * 100).toFixed(1) : 0,
        totalRewardsPaid,
      },
    });
  } catch (error) {
    console.error('Admin get referrals error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

export {
  getReferralCode,
  getReferralHistory,
  getReferralStats,
  applyReferralCode,
  validateReferralCode,
  getAdminReferrals,
};
