import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';

const getOrCreateWishlist = async (userId) => {
  let wishlist = await Wishlist.findOne({ user: userId }).populate('items.product', 'name price images stock');
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: userId, items: [] });
    wishlist = await wishlist.populate('items.product', 'name price images stock');
  }
  return wishlist;
};

const getWishlist = async (req, res) => {
  try {
    const wishlist = await getOrCreateWishlist(req.user._id);
    res.json(wishlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'productId is required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const wishlist = await getOrCreateWishlist(req.user._id);

    const exists = wishlist.items.some(
      (item) => item.product.toString() === product._id.toString()
    );

    if (exists) {
      return res.status(200).json(wishlist);
    }

    wishlist.items.push({ product: product._id });

    await wishlist.save();
    await wishlist.populate('items.product', 'name price images stock');

    res.status(201).json(wishlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.params;

    const wishlist = await getOrCreateWishlist(req.user._id);

    const initialLength = wishlist.items.length;
    wishlist.items = wishlist.items.filter(
      (item) => item.product.toString() !== productId
    );

    if (wishlist.items.length === initialLength) {
      return res.status(404).json({ message: 'Product not found in wishlist' });
    }

    await wishlist.save();
    await wishlist.populate('items.product', 'name price images stock');

    res.json(wishlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export { getWishlist, addToWishlist, removeFromWishlist };

