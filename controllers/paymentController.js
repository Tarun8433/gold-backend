import PaymentIntent from '../models/PaymentIntent.js';
import PaymentMethod from '../models/PaymentMethod.js';

const createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency, provider, metadata } = req.body;

    if (amount === undefined || Number(amount) <= 0) {
      return res.status(400).json({ message: 'amount must be greater than 0' });
    }

    const clientSecret = `pi_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const intent = await PaymentIntent.create({
      user: req.user._id,
      amount,
      currency: currency || 'USD',
      status: 'pending',
      provider,
      clientSecret,
      metadata,
    });

    res.status(201).json({
      id: intent._id,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      clientSecret: intent.clientSecret,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { intentId, success, transactionId } = req.body;

    if (!intentId) {
      return res.status(400).json({ message: 'intentId is required' });
    }

    const intent = await PaymentIntent.findOne({ _id: intentId, user: req.user._id });

    if (!intent) {
      return res.status(404).json({ message: 'Payment intent not found' });
    }

    intent.status = success ? 'succeeded' : 'failed';
    if (transactionId) {
      intent.transactionId = transactionId;
    }
    intent.verifiedAt = new Date();

    await intent.save();

    res.json(intent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const getPaymentMethods = async (req, res) => {
  try {
    const methods = await PaymentMethod.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(methods);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const addPaymentMethod = async (req, res) => {
  try {
    const { type, brand, last4, expMonth, expYear, isDefault } = req.body;

    if (!brand || !last4 || !expMonth || !expYear) {
      return res
        .status(400)
        .json({ message: 'brand, last4, expMonth and expYear are required' });
    }

    if (isDefault) {
      await PaymentMethod.updateMany(
        { user: req.user._id, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    const method = await PaymentMethod.create({
      user: req.user._id,
      type,
      brand,
      last4,
      expMonth,
      expYear,
      isDefault: Boolean(isDefault),
    });

    const methods = await PaymentMethod.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.status(201).json(methods);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const deletePaymentMethod = async (req, res) => {
  try {
    const method = await PaymentMethod.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!method) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    if (method.isDefault) {
      const another = await PaymentMethod.findOne({ user: req.user._id }).sort({
        createdAt: -1,
      });
      if (another) {
        another.isDefault = true;
        await another.save();
      }
    }

    const methods = await PaymentMethod.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.json(methods);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export {
  createPaymentIntent,
  verifyPayment,
  getPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
};

