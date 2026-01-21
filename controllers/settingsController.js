import AppSettings from '../models/AppSettings.js';

// @desc    Get all settings (admin)
// @route   GET /api/admin/settings
// @access  Private/Admin
const getSettings = async (req, res) => {
  try {
    const { category } = req.query;

    let settings;
    if (category) {
      settings = await AppSettings.find({ category }).sort({ key: 1 });
    } else {
      settings = await AppSettings.find({}).sort({ category: 1, key: 1 });
    }

    // Group by category for easier access
    const grouped = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = {};
      }
      acc[setting.category][setting.key] = setting.value;
      return acc;
    }, {});

    res.json({
      settings,
      grouped,
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get setting by key
// @route   GET /api/admin/settings/:key
// @access  Private/Admin
const getSettingByKey = async (req, res) => {
  try {
    const setting = await AppSettings.findOne({ key: req.params.key });
    if (!setting) {
      return res.status(404).json({ message: 'Setting not found' });
    }
    res.json(setting);
  } catch (error) {
    console.error('Get setting by key error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update settings (admin)
// @route   PUT /api/admin/settings
// @access  Private/Admin
const updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || !Array.isArray(settings)) {
      return res.status(400).json({ message: 'Settings array is required' });
    }

    const results = [];
    for (const setting of settings) {
      if (!setting.key || setting.value === undefined) {
        continue;
      }

      const updated = await AppSettings.findOneAndUpdate(
        { key: setting.key },
        {
          value: setting.value,
          description: setting.description,
          category: setting.category,
        },
        { upsert: true, new: true }
      );
      results.push(updated);
    }

    res.json({
      message: `${results.length} settings updated`,
      settings: results,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update single setting (admin)
// @route   PUT /api/admin/settings/:key
// @access  Private/Admin
const updateSetting = async (req, res) => {
  try {
    const { value, description, category } = req.body;

    if (value === undefined) {
      return res.status(400).json({ message: 'Value is required' });
    }

    const setting = await AppSettings.findOneAndUpdate(
      { key: req.params.key },
      { value, description, category },
      { upsert: true, new: true }
    );

    res.json(setting);
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Seed default settings (admin)
// @route   POST /api/admin/settings/seed
// @access  Private/Admin
const seedSettings = async (req, res) => {
  try {
    await AppSettings.seedDefaults();
    const settings = await AppSettings.find({}).sort({ category: 1, key: 1 });
    res.json({
      message: 'Default settings seeded successfully',
      settings,
    });
  } catch (error) {
    console.error('Seed settings error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get membership info for current user
// @route   GET /api/membership
// @access  Private
const getMembershipStatus = async (req, res) => {
  try {
    const user = req.user;

    // Update membership status if needed
    await user.updateMembershipStatus();

    const discountPercent = await AppSettings.getSetting('membership_discount_percent', 20);

    res.json({
      status: user.membership?.status || 'inactive',
      activatedAt: user.membership?.activatedAt,
      expiresAt: user.membership?.expiresAt,
      discountPercent: user.membership?.discountPercent || discountPercent,
      isActive: user.isMembershipActive(),
      daysRemaining: user.membership?.expiresAt
        ? Math.max(0, Math.ceil((new Date(user.membership.expiresAt) - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0,
    });
  } catch (error) {
    console.error('Get membership status error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

export {
  getSettings,
  getSettingByKey,
  updateSettings,
  updateSetting,
  seedSettings,
  getMembershipStatus,
};
