import User from '../models/User.js';
import LoyaltyTransaction from '../models/LoyaltyTransaction.js';
import AppSettings from '../models/AppSettings.js';

// @desc    Get loyalty points balance
// @route   GET /api/loyalty
// @access  Private
const getLoyaltyBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const pointValue = await AppSettings.getSetting('loyalty_point_value', 1);
    const minRedemption = await AppSettings.getSetting('min_loyalty_redemption', 100);
    const maxUsagePercent = await AppSettings.getSetting('max_loyalty_usage_percent', 50);

    res.json({
      points: user.loyaltyPoints || 0,
      pointValue,
      valueInRupees: (user.loyaltyPoints || 0) * pointValue,
      minRedemption,
      maxUsagePercent,
      canRedeem: (user.loyaltyPoints || 0) >= minRedemption,
    });
  } catch (error) {
    console.error('Get loyalty balance error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get loyalty transaction history
// @route   GET /api/loyalty/transactions
// @access  Private
const getLoyaltyTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { user: req.user._id };

    if (req.query.type) {
      filter.type = req.query.type;
    }

    if (req.query.source) {
      filter.source = req.query.source;
    }

    const transactions = await LoyaltyTransaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await LoyaltyTransaction.countDocuments(filter);

    res.json({
      transactions,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error('Get loyalty transactions error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Calculate loyalty points usage for checkout
// @route   POST /api/loyalty/calculate
// @access  Private
const calculateLoyaltyUsage = async (req, res) => {
  try {
    const { orderTotal, pointsToUse } = req.body;

    if (!orderTotal || orderTotal <= 0) {
      return res.status(400).json({ message: 'Valid order total is required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const availablePoints = user.loyaltyPoints || 0;
    const pointValue = await AppSettings.getSetting('loyalty_point_value', 1);
    const minRedemption = await AppSettings.getSetting('min_loyalty_redemption', 100);
    const maxUsagePercent = await AppSettings.getSetting('max_loyalty_usage_percent', 50);

    // Calculate maximum points that can be used
    const maxPointsForOrder = Math.floor((orderTotal * maxUsagePercent) / 100 / pointValue);
    const maxUsablePoints = Math.min(availablePoints, maxPointsForOrder);

    // Calculate actual points to use
    let actualPointsToUse = 0;
    if (pointsToUse && pointsToUse > 0) {
      if (pointsToUse < minRedemption && pointsToUse !== availablePoints) {
        return res.status(400).json({
          message: `Minimum ${minRedemption} points required for redemption`,
        });
      }
      actualPointsToUse = Math.min(pointsToUse, maxUsablePoints);
    }

    const discount = actualPointsToUse * pointValue;
    const newTotal = orderTotal - discount;

    res.json({
      availablePoints,
      maxUsablePoints,
      pointsToUse: actualPointsToUse,
      pointValue,
      discount,
      newTotal,
      savings: discount,
    });
  } catch (error) {
    console.error('Calculate loyalty usage error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Use loyalty points (internal - called from order/package purchase)
// @access  Internal
const useLoyaltyPoints = async (userId, points, source, description, referenceId, referenceType) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if ((user.loyaltyPoints || 0) < points) {
      throw new Error('Insufficient loyalty points');
    }

    const newBalance = (user.loyaltyPoints || 0) - points;
    user.loyaltyPoints = newBalance;
    await user.save();

    const transaction = await LoyaltyTransaction.create({
      user: userId,
      type: 'debit',
      points,
      balanceAfter: newBalance,
      source,
      description,
      referenceId,
      referenceType,
    });

    return { success: true, newBalance, transaction };
  } catch (error) {
    console.error('Use loyalty points error:', error);
    throw error;
  }
};

// @desc    Credit loyalty points (internal)
// @access  Internal
const creditLoyaltyPoints = async (userId, points, source, description, referenceId, referenceType) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const newBalance = (user.loyaltyPoints || 0) + points;
    user.loyaltyPoints = newBalance;
    await user.save();

    const transaction = await LoyaltyTransaction.create({
      user: userId,
      type: 'credit',
      points,
      balanceAfter: newBalance,
      source,
      description,
      referenceId,
      referenceType,
    });

    return { success: true, newBalance, transaction };
  } catch (error) {
    console.error('Credit loyalty points error:', error);
    throw error;
  }
};

// ============== Admin Loyalty Routes ==============

// @desc    Get all loyalty transactions (admin)
// @route   GET /api/admin/loyalty/transactions
// @access  Private/Admin
const getAdminLoyaltyTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.type) {
      filter.type = req.query.type;
    }
    if (req.query.source) {
      filter.source = req.query.source;
    }
    if (req.query.userId) {
      filter.user = req.query.userId;
    }

    const transactions = await LoyaltyTransaction.find(filter)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await LoyaltyTransaction.countDocuments(filter);

    // Get summary stats
    const creditTotal = await LoyaltyTransaction.aggregate([
      { $match: { type: 'credit' } },
      { $group: { _id: null, total: { $sum: '$points' } } },
    ]);

    const debitTotal = await LoyaltyTransaction.aggregate([
      { $match: { type: 'debit' } },
      { $group: { _id: null, total: { $sum: '$points' } } },
    ]);

    res.json({
      transactions,
      page,
      pages: Math.ceil(total / limit),
      total,
      stats: {
        totalCredited: creditTotal[0]?.total || 0,
        totalDebited: debitTotal[0]?.total || 0,
        netPoints: (creditTotal[0]?.total || 0) - (debitTotal[0]?.total || 0),
      },
    });
  } catch (error) {
    console.error('Admin get loyalty transactions error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Manually adjust loyalty points (admin)
// @route   POST /api/admin/loyalty/adjust
// @access  Private/Admin
const adjustLoyaltyPoints = async (req, res) => {
  try {
    const { userId, points, type, description } = req.body;

    if (!userId || !points || !type) {
      return res.status(400).json({ message: 'userId, points, and type are required' });
    }

    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({ message: 'Invalid type. Must be credit or debit' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let result;
    if (type === 'credit') {
      result = await creditLoyaltyPoints(
        userId,
        points,
        'admin_adjustment',
        description || 'Admin adjustment',
        req.user._id,
        'Admin'
      );
    } else {
      if ((user.loyaltyPoints || 0) < points) {
        return res.status(400).json({ message: 'User has insufficient points for debit' });
      }
      result = await useLoyaltyPoints(
        userId,
        points,
        'admin_adjustment',
        description || 'Admin adjustment',
        req.user._id,
        'Admin'
      );
    }

    res.json({
      success: true,
      message: `${points} points ${type}ed successfully`,
      newBalance: result.newBalance,
      transaction: result.transaction,
    });
  } catch (error) {
    console.error('Adjust loyalty points error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

export {
  getLoyaltyBalance,
  getLoyaltyTransactions,
  calculateLoyaltyUsage,
  useLoyaltyPoints,
  creditLoyaltyPoints,
  getAdminLoyaltyTransactions,
  adjustLoyaltyPoints,
};
