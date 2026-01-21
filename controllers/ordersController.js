import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import EMIPlan from '../models/EMIPlan.js';

const generateOrderId = async () => {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');

  let count = (await Order.countDocuments({})) + 1;

  while (true) {
    const countPart = count.toString().padStart(4, '0');
    const id = `${datePart}${countPart}`;

    const existing = await Order.findOne({ orderId: id }).select('_id');
    if (!existing) {
      return id;
    }

    count++;
  }
};

const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.product', 'name price makingCharges images')
      .populate('bill', 'invoiceNumber invoiceDate billingType grandTotal status pdfUrl');
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    })
      .populate('items.product', 'name price makingCharges images')
      .populate('bill', 'invoiceNumber invoiceDate billingType grandTotal status pdfUrl');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const createOrder = async (req, res) => {
  try {
    console.log('Create order request body:', JSON.stringify(req.body, null, 2));

    const {
      items,
      shippingAddress,
      paymentMethod,
      paymentType,
      partialAmount,
      emiPlanId,
      voucherCode,
    } = req.body;

    let orderItems = items;

    // If no items provided, get from cart
    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      const cart = await Cart.findOne({ user: req.user._id }).populate(
        'items.product',
        'name price makingCharges images'
      );

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ success: false, message: 'No items to create order' });
      }

      orderItems = cart.items
        .filter((item) => item.product != null)
        .map((item) => {
          const product = item.product;
          const basePrice = product.price;
          const makingCharge = product.makingCharges || 0;
          const finalPrice = basePrice + makingCharge;
          const image =
            Array.isArray(product.images) && product.images.length > 0
              ? product.images[0]
              : undefined;

          return {
            product: product._id,
            quantity: item.quantity,
            price: finalPrice,
            size: item.size,
            image,
          };
        });

      if (orderItems.length === 0) {
        return res.status(400).json({ success: false, message: 'No valid items in cart' });
      }
    }

    // Calculate total amount
    const totalAmount = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Calculate payment details based on type
    const paymentMethodValue = paymentMethod || 'cash';
    const paymentTypeValue = paymentType || 'full';
    let payment = {
      method: paymentMethodValue,
      type: paymentTypeValue,
      status: 'pending',
      amountPaid: 0,
      amountToPay: totalAmount,
    };

    // Handle partial payment
    if (paymentTypeValue === 'partial') {
      if (!partialAmount || partialAmount < totalAmount * 0.1) {
        return res.status(400).json({
          success: false,
          message: 'Partial payment must be at least 10% of total amount',
        });
      }
      if (partialAmount > totalAmount * 0.9) {
        return res.status(400).json({
          success: false,
          message: 'Partial payment cannot exceed 90% of total amount',
        });
      }
      payment.partialAmount = partialAmount;
      payment.remainingAmount = totalAmount - partialAmount;
      payment.amountToPay = partialAmount;
    }

    // Handle EMI payment
    else if (paymentTypeValue === 'emi') {
      if (!emiPlanId) {
        return res.status(400).json({ success: false, message: 'EMI plan is required' });
      }

      // Check if it's a dummy plan (client-generated)
      if (emiPlanId.startsWith('dummy_')) {
        // Extract months from dummy plan ID (e.g., "dummy_3" -> 3 months)
        const months = parseInt(emiPlanId.split('_')[1], 10);
        if (isNaN(months) || months < 1) {
          return res.status(400).json({ success: false, message: 'Invalid EMI plan' });
        }

        // Calculate EMI details for dummy plan
        const interestRates = { 3: 12, 6: 13, 9: 14, 12: 15, 15: 16, 18: 17, 24: 18 };
        const interestRate = interestRates[months] || 15;
        const totalWithInterest = totalAmount * (1 + interestRate / 100);
        const monthlyInstallment = totalWithInterest / months;

        payment.emiPlan = {
          months: months,
          interestRate: interestRate,
          monthlyInstallment: monthlyInstallment,
          totalAmount: totalWithInterest,
          installmentsPaid: 0,
        };
        payment.amountToPay = monthlyInstallment;
      } else {
        // Real EMI plan from database
        const emiPlan = await EMIPlan.findById(emiPlanId);
        if (!emiPlan) {
          return res.status(404).json({ success: false, message: 'EMI plan not found' });
        }

        // Check if amount is within plan limits
        if (totalAmount < emiPlan.minAmount || totalAmount > emiPlan.maxAmount) {
          return res.status(400).json({
            success: false,
            message: `EMI not available for this amount. Range: $${emiPlan.minAmount}-$${emiPlan.maxAmount}`,
          });
        }

        const totalWithInterest = emiPlan.calculateTotalAmount(totalAmount);
        const monthlyInstallment = emiPlan.calculateInstallment(totalAmount);

        payment.emiPlan = {
          planId: emiPlan._id,
          months: emiPlan.months,
          interestRate: emiPlan.interestRate,
          monthlyInstallment: monthlyInstallment,
          totalAmount: totalWithInterest,
          installmentsPaid: 0,
        };
        payment.amountToPay = monthlyInstallment;
      }
    }

    // Handle full payment (default)
    else {
      payment.amountToPay = totalAmount;
    }

    const orderId = await generateOrderId();

    // Create order
    const order = await Order.create({
      user: req.user._id,
      orderId,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod: paymentMethodValue,
      payment,
      status: 'pending',
    });

    // Clear cart after successful order
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $set: { items: [] } }
    );

    // Populate product details for response
    await order.populate('items.product', 'name price makingCharges images');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order,
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order',
      error: error.toString(),
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({ message: 'Order already cancelled' });
    }

    if (['shipped', 'delivered'].includes(order.status)) {
      return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
    }

    order.status = 'cancelled';
    await order.save();

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const trackOrder = async (req, res) => {
  try {
    const order = await Order.findOne(
      {
        _id: req.params.id,
        user: req.user._id,
      },
      {
        tracking: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
      }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export { getOrders, getOrderById, createOrder, cancelOrder, trackOrder };
