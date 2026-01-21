import mongoose from 'mongoose';

const AppSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    description: {
      type: String,
    },
    category: {
      type: String,
      enum: ['referral', 'membership', 'general', 'display', 'loyalty'],
      default: 'general',
    },
  },
  {
    timestamps: true,
  }
);

AppSettingsSchema.index({ key: 1 }, { unique: true });
AppSettingsSchema.index({ category: 1 });

// Static method to get a setting by key
AppSettingsSchema.statics.getSetting = async function (key, defaultValue = null) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : defaultValue;
};

// Static method to set a setting
AppSettingsSchema.statics.setSetting = async function (key, value, description = null, category = 'general') {
  return await this.findOneAndUpdate(
    { key },
    { key, value, description, category },
    { upsert: true, new: true }
  );
};

// Static method to get all settings by category
AppSettingsSchema.statics.getSettingsByCategory = async function (category) {
  const settings = await this.find({ category });
  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});
};

// Default settings seeding
AppSettingsSchema.statics.seedDefaults = async function () {
  const defaults = [
    {
      key: 'referral_reward_percent',
      value: 50,
      description: 'Percentage of package price credited as loyalty points to referrer',
      category: 'referral',
    },
    {
      key: 'referral_validity_days',
      value: 30,
      description: 'Number of days a referral is valid for',
      category: 'referral',
    },
    {
      key: 'membership_discount_percent',
      value: 20,
      description: 'Default discount percentage for members',
      category: 'membership',
    },
    {
      key: 'membership_default_duration_days',
      value: 365,
      description: 'Default membership duration in days',
      category: 'membership',
    },
    {
      key: 'max_loyalty_usage_percent',
      value: 50,
      description: 'Maximum percentage of order total that can be paid with loyalty points',
      category: 'loyalty',
    },
    {
      key: 'loyalty_point_value',
      value: 1,
      description: 'Value of 1 loyalty point in INR',
      category: 'loyalty',
    },
    {
      key: 'min_loyalty_redemption',
      value: 100,
      description: 'Minimum loyalty points required for redemption',
      category: 'loyalty',
    },
    {
      key: 'savings_text_template',
      value: 'Save up to ₹{amount} per year!',
      description: 'Template for savings text display',
      category: 'display',
    },
  ];

  for (const setting of defaults) {
    await this.findOneAndUpdate(
      { key: setting.key },
      setting,
      { upsert: true }
    );
  }
};

export default mongoose.model('AppSettings', AppSettingsSchema);
