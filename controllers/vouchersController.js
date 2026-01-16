import Voucher from '../models/Voucher.js';
import Cart from '../models/Cart.js';

const isVoucherUsable = (voucher) => {
  if (!voucher.isActive) {
    return 'Voucher is not active';
  }

  const now = new Date();

  if (voucher.startDate && voucher.startDate > now) {
    return 'Voucher is not yet valid';
  }

  if (voucher.endDate && voucher.endDate < now) {
    return 'Voucher has expired';
  }

  if (
    typeof voucher.usageLimit === 'number' &&
    voucher.usageLimit >= 0 &&
    voucher.usedCount >= voucher.usageLimit
  ) {
    return 'Voucher usage limit reached';
  }

  return null;
};

const getVouchers = async (req, res) => {
  try {
    const vouchers = await Voucher.find({ isActive: true }).sort({
      createdAt: -1,
    });

    const now = new Date();

    const filtered = vouchers.filter((voucher) => {
      if (voucher.startDate && voucher.startDate > now) {
        return false;
      }
      if (voucher.endDate && voucher.endDate < now) {
        return false;
      }
      if (
        typeof voucher.usageLimit === 'number' &&
        voucher.usageLimit >= 0 &&
        voucher.usedCount >= voucher.usageLimit
      ) {
        return false;
      }
      return true;
    });

    res.json(filtered);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const getVoucherByCode = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({ message: 'code is required' });
    }

    const voucher = await Voucher.findOne({ code: code.toUpperCase() });

    if (!voucher) {
      return res.status(404).json({ message: 'Voucher not found' });
    }

    const reason = isVoucherUsable(voucher);

    if (reason) {
      return res.status(400).json({ message: reason });
    }

    res.json(voucher);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const applyVoucher = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'code is required' });
    }

    const voucher = await Voucher.findOne({ code: code.toUpperCase() });

    if (!voucher) {
      return res.status(404).json({ message: 'Voucher not found' });
    }

    const reason = isVoucherUsable(voucher);

    if (reason) {
      return res.status(400).json({ message: reason });
    }

    const cart = await Cart.findOne({ user: req.user._id }).populate(
      'items.product',
      'price'
    );

    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return res.status(400).json({ message: 'No items in cart' });
    }

    const subtotal = cart.items.reduce((sum, item) => {
      const price = item.product && typeof item.product.price === 'number'
        ? item.product.price
        : 0;
      return sum + price * item.quantity;
    }, 0);

    if (subtotal <= 0) {
      return res.status(400).json({ message: 'Invalid cart total' });
    }

    if (
      typeof voucher.minAmount === 'number' &&
      subtotal < voucher.minAmount
    ) {
      return res.status(400).json({
        message: 'Cart total does not meet minimum amount',
        minAmount: voucher.minAmount,
      });
    }

    let discount = 0;

    if (voucher.discountType === 'percentage') {
      discount = (voucher.discountValue / 100) * subtotal;
    } else {
      discount = voucher.discountValue;
    }

    if (
      typeof voucher.maxDiscount === 'number' &&
      voucher.maxDiscount >= 0
    ) {
      discount = Math.min(discount, voucher.maxDiscount);
    }

    if (discount > subtotal) {
      discount = subtotal;
    }

    const total = subtotal - discount;

    voucher.usedCount += 1;
    voucher.claimedBy.push({ user: req.user._id });
    await voucher.save();

    res.json({
      voucher: {
        id: voucher._id,
        code: voucher.code,
        description: voucher.description,
        discountType: voucher.discountType,
        discountValue: voucher.discountValue,
        minAmount: voucher.minAmount,
        maxDiscount: voucher.maxDiscount,
      },
      cartTotal: subtotal,
      discount,
      total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const getMyVouchers = async (req, res) => {
  try {
    const vouchers = await Voucher.find({
      'claimedBy.user': req.user._id,
    }).sort({
      createdAt: -1,
    });

    res.json(vouchers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const seedVouchers = async (req, res) => {
  try {
    const existingVouchers = await Voucher.countDocuments();

    if (existingVouchers > 0) {
      return res.status(400).json({
        message: 'Vouchers already exist. Delete them first if you want to reseed.',
      });
    }

    const now = new Date();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const startDate = new Date(now.getTime() - oneDayMs);
    const endDate30 = new Date(now.getTime() + 30 * oneDayMs);
    const endDate60 = new Date(now.getTime() + 60 * oneDayMs);

    const vouchers = [
      {
        code: 'WELCOME10',
        description: '10% off on orders above 1000',
        startDate,
        endDate: endDate30,
        discountType: 'percentage',
        discountValue: 10,
        minAmount: 1000,
        maxDiscount: 500,
        isActive: true,
        usageLimit: 100,
      },
      {
        code: 'FESTIVE20',
        description: '20% festival discount on orders above 5000',
        startDate,
        endDate: endDate60,
        discountType: 'percentage',
        discountValue: 20,
        minAmount: 5000,
        maxDiscount: 2000,
        isActive: true,
        usageLimit: 50,
      },
      {
        code: 'FLAT500',
        description: 'Flat 500 off on orders above 3000',
        startDate,
        endDate: endDate30,
        discountType: 'fixed',
        discountValue: 500,
        minAmount: 3000,
        maxDiscount: 500,
        isActive: true,
        usageLimit: 50,
      },
      {
        code: 'NEWUSER15',
        description: '15% off for new users on orders above 1500',
        startDate,
        endDate: endDate30,
        discountType: 'percentage',
        discountValue: 15,
        minAmount: 1500,
        maxDiscount: 750,
        isActive: true,
        usageLimit: 100,
      },
    ];

    const createdVouchers = await Voucher.insertMany(vouchers);

    res.status(201).json({
      message: 'Vouchers seeded successfully',
      vouchers: createdVouchers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Server Error',
      error: error.message,
    });
  }
};

export {
  getVouchers,
  applyVoucher,
  getVoucherByCode,
  getMyVouchers,
  seedVouchers,
};
