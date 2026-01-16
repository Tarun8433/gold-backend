import EMIPlan from '../models/EMIPlan.js';

// @desc    Get EMI plans based on amount
// @route   GET /api/payment/emi-plans?amount=3500
// @access  Private
export const getEMIPlans = async (req, res) => {
  try {
    const { amount } = req.query;

    // Validate amount
    if (!amount || isNaN(amount)) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    const numericAmount = parseFloat(amount);

    if (numericAmount < 1000) {
      return res.status(400).json({
        message: 'EMI is available only for amounts above $1000',
      });
    }

    // Find active plans that support this amount
    const plans = await EMIPlan.find({
      active: true,
      minAmount: { $lte: numericAmount },
      maxAmount: { $gte: numericAmount },
    }).sort({ months: 1 });

    // Calculate monthly installments and total amounts for each plan
    const plansWithCalculations = plans.map((plan) => {
      const totalWithInterest = plan.calculateTotalAmount(numericAmount);
      const monthlyInstallment = plan.calculateInstallment(numericAmount);

      return {
        _id: plan._id,
        months: plan.months,
        interestRate: plan.interestRate,
        monthlyInstallment,
        totalAmount: totalWithInterest,
        processingFee: plan.processingFee,
      };
    });

    res.status(200).json({
      amount: numericAmount,
      plans: plansWithCalculations,
    });
  } catch (error) {
    console.error('Get EMI plans error:', error);
    res.status(500).json({
      message: 'Server error while fetching EMI plans',
      error: error.message,
    });
  }
};

// @desc    Seed default EMI plans (for development/setup)
// @route   POST /api/payment/emi-plans/seed
// @access  Private (Admin only)
export const seedEMIPlans = async (req, res) => {
  try {
    const existingPlans = await EMIPlan.countDocuments();

    if (existingPlans > 0) {
      return res.status(400).json({
        message: 'EMI plans already exist. Delete them first if you want to reseed.',
      });
    }

    const defaultPlans = [
      {
        months: 3,
        interestRate: 12.0,
        minAmount: 1000,
        maxAmount: 100000,
        processingFee: 50,
        active: true,
      },
      {
        months: 6,
        interestRate: 13.0,
        minAmount: 1000,
        maxAmount: 100000,
        processingFee: 50,
        active: true,
      },
      {
        months: 9,
        interestRate: 14.0,
        minAmount: 1000,
        maxAmount: 100000,
        processingFee: 50,
        active: true,
      },
      {
        months: 12,
        interestRate: 15.0,
        minAmount: 1000,
        maxAmount: 100000,
        processingFee: 50,
        active: true,
      },
      {
        months: 15,
        interestRate: 16.0,
        minAmount: 1000,
        maxAmount: 100000,
        processingFee: 50,
        active: true,
      },
      {
        months: 18,
        interestRate: 17.0,
        minAmount: 1000,
        maxAmount: 100000,
        processingFee: 50,
        active: true,
      },
      {
        months: 24,
        interestRate: 18.0,
        minAmount: 1000,
        maxAmount: 100000,
        processingFee: 50,
        active: true,
      },
    ];

    const createdPlans = await EMIPlan.insertMany(defaultPlans);

    res.status(201).json({
      message: 'EMI plans seeded successfully',
      plans: createdPlans,
    });
  } catch (error) {
    console.error('Seed EMI plans error:', error);
    res.status(500).json({
      message: 'Server error while seeding EMI plans',
      error: error.message,
    });
  }
};

// @desc    Get all EMI plans (admin)
// @route   GET /api/payment/emi-plans/all
// @access  Private (Admin)
export const getAllEMIPlans = async (req, res) => {
  try {
    const plans = await EMIPlan.find().sort({ months: 1 });
    res.status(200).json({ plans });
  } catch (error) {
    console.error('Get all EMI plans error:', error);
    res.status(500).json({
      message: 'Server error while fetching all EMI plans',
      error: error.message,
    });
  }
};

// @desc    Create new EMI plan (admin)
// @route   POST /api/payment/emi-plans
// @access  Private (Admin)
export const createEMIPlan = async (req, res) => {
  try {
    const { months, interestRate, minAmount, maxAmount, processingFee, active } =
      req.body;

    // Validation
    if (!months || !interestRate) {
      return res.status(400).json({
        message: 'Months and interest rate are required',
      });
    }

    const newPlan = await EMIPlan.create({
      months,
      interestRate,
      minAmount: minAmount || 1000,
      maxAmount: maxAmount || 100000,
      processingFee: processingFee || 50,
      active: active !== undefined ? active : true,
    });

    res.status(201).json({
      message: 'EMI plan created successfully',
      plan: newPlan,
    });
  } catch (error) {
    console.error('Create EMI plan error:', error);
    res.status(500).json({
      message: 'Server error while creating EMI plan',
      error: error.message,
    });
  }
};

// @desc    Update EMI plan (admin)
// @route   PUT /api/payment/emi-plans/:id
// @access  Private (Admin)
export const updateEMIPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const plan = await EMIPlan.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!plan) {
      return res.status(404).json({ message: 'EMI plan not found' });
    }

    res.status(200).json({
      message: 'EMI plan updated successfully',
      plan,
    });
  } catch (error) {
    console.error('Update EMI plan error:', error);
    res.status(500).json({
      message: 'Server error while updating EMI plan',
      error: error.message,
    });
  }
};

// @desc    Delete EMI plan (admin)
// @route   DELETE /api/payment/emi-plans/:id
// @access  Private (Admin)
export const deleteEMIPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await EMIPlan.findByIdAndDelete(id);

    if (!plan) {
      return res.status(404).json({ message: 'EMI plan not found' });
    }

    res.status(200).json({
      message: 'EMI plan deleted successfully',
    });
  } catch (error) {
    console.error('Delete EMI plan error:', error);
    res.status(500).json({
      message: 'Server error while deleting EMI plan',
      error: error.message,
    });
  }
};
