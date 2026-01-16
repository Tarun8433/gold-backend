import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate('items.product', 'name price makingCharges images stock');
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
    cart = await cart.populate('items.product', 'name price images stock');
  }
  return cart;
};

const getCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    res.json(cart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'productId is required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const cart = await getOrCreateCart(req.user._id);

    const existingItem = cart.items.find(
      (item) => item.product.toString() === product._id.toString()
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ product: product._id, quantity });
    }

    await cart.save();
    await cart.populate('items.product', 'name price images stock');

    res.status(201).json(cart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== 'number' || quantity < 1) {
      return res.status(400).json({ message: 'quantity must be a positive number' });
    }

    const cart = await getOrCreateCart(req.user._id);
    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    item.quantity = quantity;

    await cart.save();
    await cart.populate('items.product', 'name price images stock');

    res.json(cart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const removeCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const cart = await getOrCreateCart(req.user._id);
    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    item.deleteOne();

    await cart.save();
    await cart.populate('items.product', 'name price images stock');

    res.json(cart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const clearCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user._id);

    cart.items = [];
    await cart.save();

    res.json(cart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const isProductInCart = async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.json({ inCart: false });
    }

    const inCart = cart.items.some(
      (item) => item.product.toString() === productId
    );

    res.json({ inCart });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const syncCart = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'items must be an array' });
    }

    const cart = await getOrCreateCart(req.user._id);

    const validatedItems = [];

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity < 1) {
        continue;
      }

      const product = await Product.findById(item.productId);
      if (!product) {
        continue;
      }

      validatedItems.push({
        product: product._id,
        quantity: item.quantity,
      });
    }

    cart.items = validatedItems;
    await cart.save();
    await cart.populate('items.product', 'name price images stock');

    res.json(cart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const validateCartForCheckout = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      'items.product',
      'name price makingCharges stock'
    );

    if (!cart || cart.items.length === 0) {
      return res.status(404).json({
        valid: false,
        message: 'Cart is empty',
        items: [],
        warnings: [],
        errors: ['Cart is empty'],
      });
    }

    let valid = true;
    const warnings = [];
    const errors = [];
    const itemsStatus = [];

    for (const item of cart.items) {
      const product = item.product;

      if (!product) {
        valid = false;
        errors.push(`Product not found for cart item`);
        itemsStatus.push({
          productId: item.product,
          available: false,
          inStock: false,
          currentPrice: 0,
          priceChanged: false,
        });
        continue;
      }

      const itemValid = {
        productId: product._id,
        available: true,
        inStock: product.stock >= item.quantity,
        currentPrice: product.price + (product.makingCharges || 0),
        priceChanged: false,
      };

      // Check stock availability
      if (!itemValid.inStock) {
        valid = false;
        errors.push(
          `${product.name} is out of stock (requested: ${item.quantity}, available: ${product.stock})`
        );
      }

      itemsStatus.push(itemValid);
    }

    res.status(valid ? 200 : 422).json({
      valid,
      items: itemsStatus,
      warnings,
      errors,
    });
  } catch (error) {
    console.error('Validate cart error:', error);
    res.status(500).json({
      message: 'Server error while validating cart',
      error: error.message,
    });
  }
};

const getCheckoutPriceBreakdown = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id }).populate(
      'items.product',
      'name price makingCharges stock'
    );

    if (!cart || cart.items.length === 0) {
      return res.status(404).json({
        message: 'Cart is empty',
        items: [],
        subtotal: 0,
        makingCharges: 0,
        gst: 0,
        shipping: 0,
        discount: 0,
        total: 0,
      });
    }

    const items = cart.items.map((item) => {
      const product = item.product;
      const basePrice = product.price;
      const makingCharge = product.makingCharges || 0;
      const unitTotal = basePrice + makingCharge;
      const lineSubtotal = basePrice * item.quantity;
      const lineMakingCharges = makingCharge * item.quantity;
      const lineTotal = unitTotal * item.quantity;

      return {
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        price: basePrice,
        makingCharges: makingCharge,
        lineSubtotal,
        lineMakingCharges,
        lineTotal,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.lineSubtotal, 0);
    const makingCharges = items.reduce(
      (sum, item) => sum + item.lineMakingCharges,
      0
    );
    const taxableAmount = subtotal + makingCharges;
    const gst = taxableAmount * 0.18;
    const shipping = taxableAmount > 50 ? 0 : 5;
    const discount = 0;
    const total = subtotal + makingCharges + gst + shipping - discount;

    res.json({
      items,
      subtotal,
      makingCharges,
      gst,
      shipping,
      discount,
      total,
    });
  } catch (error) {
    console.error('Checkout price breakdown error:', error);
    res.status(500).json({
      message: 'Server error while calculating checkout price breakdown',
      error: error.message,
    });
  }
};

export {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  syncCart,
  isProductInCart,
  validateCartForCheckout,
  getCheckoutPriceBreakdown,
};
