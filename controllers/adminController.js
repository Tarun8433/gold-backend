import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';
import Voucher from '../models/Voucher.js';
import User from '../models/User.js';

// ============== Dashboard ==============

// @desc    Get dashboard stats
// @route   GET /api/admin/dashboard/stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    // Get counts
    const totalProducts = await Product.countDocuments({});
    const totalCategories = await Category.countDocuments({});
    const totalOrders = await Order.countDocuments({});
    const totalUsers = await User.countDocuments({});
    const totalVouchers = await Voucher.countDocuments({});

    // Order stats by status
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const processingOrders = await Order.countDocuments({ status: 'processing' });
    const shippedOrders = await Order.countDocuments({ status: 'shipped' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
    const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });

    // Revenue from delivered orders
    const revenueResult = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

    // Active vouchers
    const now = new Date();
    const activeVouchers = await Voucher.countDocuments({
      isActive: true,
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: now } },
      ],
    });

    // Low stock products (stock <= 5)
    const lowStockProducts = await Product.countDocuments({ stock: { $lte: 5, $gt: 0 } });
    const outOfStockProducts = await Product.countDocuments({ stock: 0 });

    // Recent orders (last 10)
    const recentOrders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'name email')
      .populate('items.product', 'name images');

    res.json({
      products: {
        total: totalProducts,
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
      },
      categories: {
        total: totalCategories,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        processing: processingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
      },
      users: {
        total: totalUsers,
      },
      vouchers: {
        total: totalVouchers,
        active: activeVouchers,
      },
      revenue: {
        total: totalRevenue,
      },
      recentOrders,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// ============== Products ==============

// @desc    Get all products (admin)
// @route   GET /api/admin/products
// @access  Private/Admin
const getAdminProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.category) {
      filter.category = req.query.category;
    }

    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .select('-reviews');

    const total = await Product.countDocuments(filter);

    res.json({
      products,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get product by ID (admin)
// @route   GET /api/admin/products/:id
// @access  Private/Admin
const getAdminProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select('-reviews');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create product (admin)
// @route   POST /api/admin/products
// @access  Private/Admin
const createAdminProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      originalPrice,
      makingChargesPercent,
      images,
      category,
      material,
      weight,
      sizes,
      variantType,
      stock,
      isFeatured,
      isNewArrival,
      isBestSeller,
      tags,
    } = req.body;

    // Resolve making charges percentage from category if not provided
    let percent = makingChargesPercent;
    if (percent === undefined || percent === null) {
      const categoryDoc = await Category.findOne({ name: category });
      if (categoryDoc) {
        const byMaterial =
          categoryDoc.makingChargesPercentByMaterial?.get?.(material) ??
          (categoryDoc.makingChargesPercentByMaterial
            ? categoryDoc.makingChargesPercentByMaterial[material]
            : undefined);
        percent = byMaterial ?? categoryDoc.makingChargesPercentDefault ?? 0;
      } else {
        percent = 0;
      }
    }

    const makingCharges = price && percent ? (price * percent) / 100 : 0;

    const product = await Product.create({
      name,
      description,
      price,
      originalPrice,
      makingChargesPercent: percent,
      makingCharges,
      images,
      category,
      material,
      weight,
      sizes,
      variantType,
      stock,
      isFeatured,
      isNewArrival,
      isBestSeller,
      tags,
    });

    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Update product (admin)
// @route   PUT /api/admin/products/:id
// @access  Private/Admin
const updateAdminProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const {
      name,
      description,
      price,
      originalPrice,
      makingChargesPercent,
      images,
      category,
      material,
      weight,
      sizes,
      stock,
      isFeatured,
      isNewArrival,
      isBestSeller,
      tags,
    } = req.body;

    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (originalPrice !== undefined) product.originalPrice = originalPrice;
    if (images !== undefined) product.images = images;
    if (category !== undefined) product.category = category;
    if (material !== undefined) product.material = material;
    if (weight !== undefined) product.weight = weight;
    if (sizes !== undefined) product.sizes = sizes;
    if (variantType !== undefined) product.variantType = variantType;
    if (stock !== undefined) product.stock = stock;
    if (isFeatured !== undefined) product.isFeatured = isFeatured;
    if (isNewArrival !== undefined) product.isNewArrival = isNewArrival;
    if (isBestSeller !== undefined) product.isBestSeller = isBestSeller;
    if (tags !== undefined) product.tags = tags;

    // Handle making charges
    const nextPercent = makingChargesPercent !== undefined ? makingChargesPercent : product.makingChargesPercent;
    const nextCategory = category || product.category;
    const nextMaterial = material || product.material;

    let percentForCompute = nextPercent;
    if (percentForCompute === undefined || percentForCompute === null) {
      const categoryDoc = await Category.findOne({ name: nextCategory });
      if (categoryDoc) {
        const byMaterial =
          categoryDoc.makingChargesPercentByMaterial?.get?.(nextMaterial) ??
          (categoryDoc.makingChargesPercentByMaterial
            ? categoryDoc.makingChargesPercentByMaterial[nextMaterial]
            : undefined);
        percentForCompute = byMaterial ?? categoryDoc.makingChargesPercentDefault ?? 0;
      } else {
        percentForCompute = 0;
      }
    }

    product.makingChargesPercent = percentForCompute;
    const basePrice = price !== undefined ? price : product.price;
    product.makingCharges = basePrice && percentForCompute ? (basePrice * percentForCompute) / 100 : 0;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Delete product (admin)
// @route   DELETE /api/admin/products/:id
// @access  Private/Admin
const deleteAdminProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await product.deleteOne();
    res.json({ message: 'Product removed', id: req.params.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ============== Categories ==============

// @desc    Get all categories (admin)
// @route   GET /api/admin/categories
// @access  Private/Admin
const getAdminCategories = async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get category by ID (admin)
// @route   GET /api/admin/categories/:id
// @access  Private/Admin
const getAdminCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create category (admin)
// @route   POST /api/admin/categories
// @access  Private/Admin
const createAdminCategory = async (req, res) => {
  try {
    const {
      name,
      description,
      image,
      makingChargesMin,
      makingChargesMax,
      makingChargesPercentDefault,
      makingChargesPercentByMaterial,
    } = req.body;

    // Check if category already exists
    const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingCategory) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const category = await Category.create({
      name,
      description,
      image,
      makingChargesMin,
      makingChargesMax,
      makingChargesPercentDefault,
      makingChargesPercentByMaterial,
    });

    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Update category (admin)
// @route   PUT /api/admin/categories/:id
// @access  Private/Admin
const updateAdminCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const {
      name,
      description,
      image,
      makingChargesMin,
      makingChargesMax,
      makingChargesPercentDefault,
      makingChargesPercentByMaterial,
    } = req.body;

    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (makingChargesMin !== undefined) category.makingChargesMin = makingChargesMin;
    if (makingChargesMax !== undefined) category.makingChargesMax = makingChargesMax;
    if (makingChargesPercentDefault !== undefined) category.makingChargesPercentDefault = makingChargesPercentDefault;
    if (makingChargesPercentByMaterial !== undefined) category.makingChargesPercentByMaterial = makingChargesPercentByMaterial;

    const updatedCategory = await category.save();
    res.json(updatedCategory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Delete category (admin)
// @route   DELETE /api/admin/categories/:id
// @access  Private/Admin
const deleteAdminCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Check if any products use this category
    const productsUsingCategory = await Product.countDocuments({ category: category.name });
    if (productsUsingCategory > 0) {
      return res.status(400).json({
        message: `Cannot delete category. ${productsUsingCategory} product(s) are using this category.`,
      });
    }

    await category.deleteOne();
    res.json({ message: 'Category removed', id: req.params.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ============== Orders ==============

// @desc    Get all orders (admin)
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAdminOrders = async (req, res) => {
  try {
    const filter = {};

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('user', 'name email phone')
      .populate('items.product', 'name price makingCharges images');

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get order by ID (admin)
// @route   GET /api/admin/orders/:id
// @access  Private/Admin
const getAdminOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('items.product', 'name price makingCharges images');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update order status (admin)
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { status, trackingCarrier, trackingNumber } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    // Update status
    order.status = status;

    // Add tracking info if shipping
    if (status === 'shipped' || trackingCarrier || trackingNumber) {
      if (!order.tracking) {
        order.tracking = { history: [] };
      }
      if (trackingCarrier) order.tracking.carrier = trackingCarrier;
      if (trackingNumber) order.tracking.trackingNumber = trackingNumber;

      // Add to history
      order.tracking.history.push({
        status: status,
        location: '',
        date: new Date(),
      });
    }

    // Update payment status if delivered
    if (status === 'delivered') {
      order.paymentStatus = 'paid';
      if (order.payment) {
        order.payment.status = 'completed';
        order.payment.amountPaid = order.totalAmount;
      }
    }

    await order.save();

    // Re-populate for response
    await order.populate('user', 'name email phone');
    await order.populate('items.product', 'name price makingCharges images');

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Generate bill for order (admin)
// @route   GET /api/admin/orders/:id/bill
// @access  Private/Admin
const generateOrderBill = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('items.product', 'name price makingCharges images category material weight');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Calculate bill details
    let subtotal = 0;
    let totalMakingCharges = 0;

    const billItems = order.items.map((item) => {
      const product = item.product;
      const basePrice = product ? product.price : item.price;
      const makingCharges = product ? (product.makingCharges || 0) : 0;
      const itemSubtotal = basePrice * item.quantity;
      const itemMakingCharges = makingCharges * item.quantity;

      subtotal += itemSubtotal;
      totalMakingCharges += itemMakingCharges;

      return {
        productId: product ? product._id : null,
        name: product ? product.name : 'Unknown Product',
        category: product ? product.category : '',
        material: product ? product.material : '',
        weight: product ? product.weight : null,
        quantity: item.quantity,
        size: item.size,
        basePrice: basePrice,
        makingCharges: makingCharges,
        itemTotal: itemSubtotal + itemMakingCharges,
        image: item.image || (product && product.images && product.images[0]),
      };
    });

    const grandTotal = subtotal + totalMakingCharges;

    const bill = {
      orderId: order.orderId,
      orderDate: order.createdAt,
      customer: {
        name: order.user ? order.user.name : 'Guest',
        email: order.user ? order.user.email : '',
        phone: order.user ? order.user.phone : '',
      },
      shippingAddress: order.shippingAddress,
      items: billItems,
      summary: {
        subtotal: subtotal,
        makingCharges: totalMakingCharges,
        grandTotal: grandTotal,
        totalAmount: order.totalAmount,
      },
      payment: {
        method: order.payment ? order.payment.method : order.paymentMethod,
        type: order.payment ? order.payment.type : 'full',
        status: order.payment ? order.payment.status : order.paymentStatus,
        amountPaid: order.payment ? order.payment.amountPaid : 0,
        amountToPay: order.payment ? order.payment.amountToPay : order.totalAmount,
      },
      status: order.status,
      generatedAt: new Date(),
    };

    res.json(bill);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ============== Vouchers ==============

// @desc    Get all vouchers (admin)
// @route   GET /api/admin/vouchers
// @access  Private/Admin
const getAdminVouchers = async (req, res) => {
  try {
    const vouchers = await Voucher.find({}).sort({ createdAt: -1 });
    res.json(vouchers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get voucher by ID (admin)
// @route   GET /api/admin/vouchers/:id
// @access  Private/Admin
const getAdminVoucherById = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);

    if (!voucher) {
      return res.status(404).json({ message: 'Voucher not found' });
    }

    res.json(voucher);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create voucher (admin)
// @route   POST /api/admin/vouchers
// @access  Private/Admin
const createAdminVoucher = async (req, res) => {
  try {
    const {
      code,
      description,
      startDate,
      endDate,
      discountType,
      discountValue,
      minAmount,
      maxDiscount,
      isActive,
      usageLimit,
    } = req.body;

    // Check if voucher code already exists
    const existingVoucher = await Voucher.findOne({ code: code.toUpperCase() });
    if (existingVoucher) {
      return res.status(400).json({ message: 'Voucher code already exists' });
    }

    const voucher = await Voucher.create({
      code: code.toUpperCase(),
      description,
      startDate,
      endDate,
      discountType,
      discountValue,
      minAmount,
      maxDiscount,
      isActive: isActive !== undefined ? isActive : true,
      usageLimit,
    });

    res.status(201).json(voucher);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Update voucher (admin)
// @route   PUT /api/admin/vouchers/:id
// @access  Private/Admin
const updateAdminVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);

    if (!voucher) {
      return res.status(404).json({ message: 'Voucher not found' });
    }

    const {
      code,
      description,
      startDate,
      endDate,
      discountType,
      discountValue,
      minAmount,
      maxDiscount,
      isActive,
      usageLimit,
    } = req.body;

    // Check if new code conflicts with existing voucher
    if (code && code.toUpperCase() !== voucher.code) {
      const existingVoucher = await Voucher.findOne({ code: code.toUpperCase() });
      if (existingVoucher) {
        return res.status(400).json({ message: 'Voucher code already exists' });
      }
      voucher.code = code.toUpperCase();
    }

    if (description !== undefined) voucher.description = description;
    if (startDate !== undefined) voucher.startDate = startDate;
    if (endDate !== undefined) voucher.endDate = endDate;
    if (discountType !== undefined) voucher.discountType = discountType;
    if (discountValue !== undefined) voucher.discountValue = discountValue;
    if (minAmount !== undefined) voucher.minAmount = minAmount;
    if (maxDiscount !== undefined) voucher.maxDiscount = maxDiscount;
    if (isActive !== undefined) voucher.isActive = isActive;
    if (usageLimit !== undefined) voucher.usageLimit = usageLimit;

    const updatedVoucher = await voucher.save();
    res.json(updatedVoucher);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Delete voucher (admin)
// @route   DELETE /api/admin/vouchers/:id
// @access  Private/Admin
const deleteAdminVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);

    if (!voucher) {
      return res.status(404).json({ message: 'Voucher not found' });
    }

    await voucher.deleteOne();
    res.json({ message: 'Voucher removed', id: req.params.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ============== Customers ==============

// @desc    Get all customers with payment settings (admin)
// @route   GET /api/admin/customers
// @access  Private/Admin
const getAdminCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = { isAdmin: false };

    // Search by name, email, or phone
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
        { phone: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    // Filter by EMI enabled
    if (req.query.emiEnabled === 'true') {
      filter['paymentSettings.emiEnabled'] = true;
    } else if (req.query.emiEnabled === 'false') {
      filter['paymentSettings.emiEnabled'] = { $ne: true };
    }

    // Filter by partial payment enabled
    if (req.query.partialEnabled === 'true') {
      filter['paymentSettings.partialPaymentEnabled'] = true;
    } else if (req.query.partialEnabled === 'false') {
      filter['paymentSettings.partialPaymentEnabled'] = { $ne: true };
    }

    const customers = await User.find(filter)
      .select('-password')
      .sort({ date: -1 })
      .limit(limit)
      .skip(skip);

    // Get order counts for each customer
    const customerIds = customers.map((c) => c._id);
    const orderCounts = await Order.aggregate([
      { $match: { user: { $in: customerIds } } },
      { $group: { _id: '$user', count: { $sum: 1 }, totalSpent: { $sum: '$totalAmount' } } },
    ]);

    const orderCountMap = {};
    orderCounts.forEach((oc) => {
      orderCountMap[oc._id.toString()] = { count: oc.count, totalSpent: oc.totalSpent };
    });

    const customersWithStats = customers.map((customer) => {
      const stats = orderCountMap[customer._id.toString()] || { count: 0, totalSpent: 0 };
      return {
        ...customer.toObject(),
        orderCount: stats.count,
        totalSpent: stats.totalSpent,
      };
    });

    const total = await User.countDocuments(filter);

    res.json({
      customers: customersWithStats,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get customer by ID (admin)
// @route   GET /api/admin/customers/:id
// @access  Private/Admin
const getAdminCustomerById = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id).select('-password');

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Get customer's orders
    const orders = await Order.find({ user: customer._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('items.product', 'name images');

    // Calculate stats
    const allOrders = await Order.find({ user: customer._id });
    const totalSpent = allOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const completedOrders = allOrders.filter((o) => o.status === 'delivered').length;

    res.json({
      customer,
      orders,
      stats: {
        totalOrders: allOrders.length,
        completedOrders,
        totalSpent,
      },
    });
  } catch (error) {
    console.error('Get customer by ID error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update customer payment settings (admin)
// @route   PUT /api/admin/customers/:id/payment-settings
// @access  Private/Admin
const updateCustomerPaymentSettings = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (customer.isAdmin) {
      return res.status(400).json({ message: 'Cannot modify admin user settings' });
    }

    const {
      emiEnabled,
      partialPaymentEnabled,
      allowedEmiTenures,
      minPartialPaymentPercent,
      maxPartialPaymentPercent,
      canConvertPartialToEmi,
      creditLimit,
      trustScore,
      notes,
    } = req.body;

    // Initialize paymentSettings if not exists
    if (!customer.paymentSettings) {
      customer.paymentSettings = {};
    }

    // Update only provided fields
    if (emiEnabled !== undefined) customer.paymentSettings.emiEnabled = emiEnabled;
    if (partialPaymentEnabled !== undefined) customer.paymentSettings.partialPaymentEnabled = partialPaymentEnabled;
    if (allowedEmiTenures !== undefined) customer.paymentSettings.allowedEmiTenures = allowedEmiTenures;
    if (minPartialPaymentPercent !== undefined) customer.paymentSettings.minPartialPaymentPercent = minPartialPaymentPercent;
    if (maxPartialPaymentPercent !== undefined) customer.paymentSettings.maxPartialPaymentPercent = maxPartialPaymentPercent;
    if (canConvertPartialToEmi !== undefined) customer.paymentSettings.canConvertPartialToEmi = canConvertPartialToEmi;
    if (creditLimit !== undefined) customer.paymentSettings.creditLimit = creditLimit;
    if (trustScore !== undefined) customer.paymentSettings.trustScore = trustScore;
    if (notes !== undefined) customer.paymentSettings.notes = notes;

    await customer.save();

    res.json({
      message: 'Payment settings updated successfully',
      customer: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        paymentSettings: customer.paymentSettings,
      },
    });
  } catch (error) {
    console.error('Update payment settings error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Bulk update payment settings for multiple customers (admin)
// @route   PUT /api/admin/customers/bulk-payment-settings
// @access  Private/Admin
const bulkUpdatePaymentSettings = async (req, res) => {
  try {
    const { customerIds, settings } = req.body;

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return res.status(400).json({ message: 'customerIds must be a non-empty array' });
    }

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ message: 'settings must be an object' });
    }

    // Build update object
    const updateObj = {};
    if (settings.emiEnabled !== undefined) updateObj['paymentSettings.emiEnabled'] = settings.emiEnabled;
    if (settings.partialPaymentEnabled !== undefined) updateObj['paymentSettings.partialPaymentEnabled'] = settings.partialPaymentEnabled;
    if (settings.allowedEmiTenures !== undefined) updateObj['paymentSettings.allowedEmiTenures'] = settings.allowedEmiTenures;
    if (settings.minPartialPaymentPercent !== undefined) updateObj['paymentSettings.minPartialPaymentPercent'] = settings.minPartialPaymentPercent;
    if (settings.maxPartialPaymentPercent !== undefined) updateObj['paymentSettings.maxPartialPaymentPercent'] = settings.maxPartialPaymentPercent;
    if (settings.canConvertPartialToEmi !== undefined) updateObj['paymentSettings.canConvertPartialToEmi'] = settings.canConvertPartialToEmi;

    const result = await User.updateMany(
      { _id: { $in: customerIds }, isAdmin: false },
      { $set: updateObj }
    );

    res.json({
      message: `Payment settings updated for ${result.modifiedCount} customers`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Bulk update payment settings error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

export {
  // Dashboard
  getDashboardStats,
  // Products
  getAdminProducts,
  getAdminProductById,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  // Categories
  getAdminCategories,
  getAdminCategoryById,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  // Orders
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
  generateOrderBill,
  // Vouchers
  getAdminVouchers,
  getAdminVoucherById,
  createAdminVoucher,
  updateAdminVoucher,
  deleteAdminVoucher,
  // Customers
  getAdminCustomers,
  getAdminCustomerById,
  updateCustomerPaymentSettings,
  bulkUpdatePaymentSettings,
};
