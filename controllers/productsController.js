import Product from '../models/Product.js';
import Category from '../models/Category.js';

const isObjectIdString = (value) =>
  typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);

const resolveCategoryName = async (value) => {
  if (!value) return null;
  if (isObjectIdString(value)) {
    const categoryDoc = await Category.findById(value);
    return categoryDoc ? categoryDoc.name : null;
  }
  return value;
};

// @desc    Get all products with pagination and filters
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};

    // Category filter
    if (req.query.category) {
      filter.category = req.query.category;
    }

    // Material filter
    if (req.query.material) {
      filter.material = req.query.material;
    }

    // Price range filter
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) {
        filter.price.$gte = parseFloat(req.query.minPrice);
      }
      if (req.query.maxPrice) {
        filter.price.$lte = parseFloat(req.query.maxPrice);
      }
    }

    // Rating filter
    if (req.query.minRating) {
      filter.rating = { $gte: parseFloat(req.query.minRating) };
    }

    // In stock filter
    if (req.query.inStock === 'true') {
      filter.stock = { $gt: 0 };
    }

    // Build sort object
    let sort = {};
    switch (req.query.sortBy) {
      case 'price_asc':
        sort = { price: 1 };
        break;
      case 'price_desc':
        sort = { price: -1 };
        break;
      case 'rating':
        sort = { rating: -1 };
        break;
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'popular':
        sort = { soldCount: -1 };
        break;
      default:
        sort = { createdAt: -1 };
    }

    // Execute query
    const products = await Product.find(filter)
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .select('-reviews'); // Exclude reviews for list view

    const total = await Product.countDocuments(filter);

    res.json({
      products,
      page,
      pages: Math.ceil(total / limit),
      total,
      limit,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      'reviews.user',
      'name avatar'
    );

    if (product) {
      // Increment view count
      product.viewCount += 1;
      await product.save();

      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      res.status(404).json({ message: 'Product not found' });
    } else {
      res.status(500).json({ message: 'Server Error' });
    }
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
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

    const categoryName = await resolveCategoryName(category);
    if (!categoryName) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    const materialValue = material === 'Other' ? undefined : material;

    // Resolve making charges percentage
    let percent = makingChargesPercent;
    if (percent === undefined || percent === null) {
      const categoryDoc = await Category.findOne({ name: categoryName });
      if (categoryDoc) {
        const byMaterial =
          categoryDoc.makingChargesPercentByMaterial?.get?.(materialValue) ??
          (categoryDoc.makingChargesPercentByMaterial
            ? categoryDoc.makingChargesPercentByMaterial[materialValue]
            : undefined);
        percent = byMaterial ?? categoryDoc.makingChargesPercentDefault ?? 0;
      } else {
        percent = 0;
      }
    }
    // Compute making charges as percentage of base price
    const makingCharges = price && percent ? (price * percent) / 100 : 0;

    const product = await Product.create({
      name,
      description,
      price,
      originalPrice,
      makingChargesPercent: percent,
      makingCharges,
      images,
      category: categoryName,
      material: materialValue,
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

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
  const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      product.name = req.body.name || product.name;
      product.description = req.body.description || product.description;
      product.price = req.body.price !== undefined ? req.body.price : product.price;
      product.originalPrice = req.body.originalPrice !== undefined ? req.body.originalPrice : product.originalPrice;
      // Resolve percent from request or category defaults if changed
      const nextPercent =
        req.body.makingChargesPercent !== undefined
          ? req.body.makingChargesPercent
          : product.makingChargesPercent;
      product.makingChargesPercent = nextPercent;
      let categoryName = product.category;
      if (req.body.category !== undefined) {
        const resolved = await resolveCategoryName(req.body.category);
        if (!resolved) {
          return res.status(400).json({ message: 'Invalid category' });
        }
        categoryName = resolved;
      }
      const nextCategory = categoryName;
      const nextMaterialRaw = req.body.material !== undefined ? req.body.material : product.material;
      const nextMaterial =
        nextMaterialRaw === 'Other' ? undefined : nextMaterialRaw;
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
      const basePrice = req.body.price !== undefined ? req.body.price : product.price;
      product.makingCharges = basePrice && percentForCompute ? (basePrice * percentForCompute) / 100 : 0;
      product.images = req.body.images || product.images;
      product.category = categoryName;
      product.material = nextMaterial;
      product.weight = req.body.weight !== undefined ? req.body.weight : product.weight;
      product.sizes = req.body.sizes || product.sizes;
      product.variantType =
        req.body.variantType !== undefined ? req.body.variantType : product.variantType;
      product.stock = req.body.stock !== undefined ? req.body.stock : product.stock;
      product.isFeatured = req.body.isFeatured !== undefined ? req.body.isFeatured : product.isFeatured;
      product.isNewArrival = req.body.isNewArrival !== undefined ? req.body.isNewArrival : product.isNewArrival;
      product.isBestSeller = req.body.isBestSeller !== undefined ? req.body.isBestSeller : product.isBestSeller;
      product.tags = req.body.tags || product.tags;

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      await product.deleteOne();
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Search products
// @route   GET /api/products/search
// @access  Public
const searchProducts = async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Text search on name, description, and tags
    const products = await Product.find(
      { $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(parseInt(limit))
      .skip(skip)
      .select('-reviews');

    const total = await Product.countDocuments({ $text: { $search: q } });

    res.json({
      products,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total,
      query: q,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const products = await Product.find({ isFeatured: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-reviews');

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get new arrival products
// @route   GET /api/products/new-arrivals
// @access  Public
const getNewArrivals = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const products = await Product.find({ isNewArrival: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-reviews');

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get best seller products
// @route   GET /api/products/best-sellers
// @access  Public
const getBestSellers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const products = await Product.find({ isBestSeller: true })
      .sort({ soldCount: -1 })
      .limit(limit)
      .select('-reviews');

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get recommended products for user
// @route   GET /api/products/recommendations
// @access  Public
const getRecommendations = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    // Simple recommendation: Get products with high ratings and high sold count
    // In production, implement a more sophisticated recommendation algorithm
    // based on user preferences, browsing history, etc.
    const products = await Product.find({ stock: { $gt: 0 } })
      .sort({ rating: -1, soldCount: -1 })
      .limit(limit)
      .select('-reviews');

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getFeaturedProducts,
  getNewArrivals,
  getBestSellers,
  getRecommendations,
};
