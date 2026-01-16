import Category from '../models/Category.js';
import Product from '../models/Product.js';

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({});
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get category by ID
// @route   GET /api/categories/:id
// @access  Public
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (category) {
      res.json(category);
    } else {
      res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      res.status(404).json({ message: 'Category not found' });
    } else {
      res.status(500).json({ message: 'Server Error' });
    }
  }
};

// @desc    Get products in category
// @route   GET /api/categories/:id/products
// @access  Public
const getCategoryProducts = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Assuming Product model uses category name as reference
    const products = await Product.find({ category: category.name });
    res.json(products);
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      res.status(404).json({ message: 'Category not found' });
    } else {
      res.status(500).json({ message: 'Server Error' });
    }
  }
};

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
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

    const categoryExists = await Category.findOne({ name });

    if (categoryExists) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    if (
      typeof makingChargesMin === 'number' &&
      typeof makingChargesMax === 'number' &&
      makingChargesMax < makingChargesMin
    ) {
      return res
        .status(400)
        .json({ message: 'makingChargesMax must be greater than or equal to makingChargesMin' });
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
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (category) {
      category.name = req.body.name || category.name;
      category.description = req.body.description || category.description;
      category.image = req.body.image || category.image;
      if (req.body.makingChargesMin !== undefined) {
        category.makingChargesMin = req.body.makingChargesMin;
      }
      if (req.body.makingChargesMax !== undefined) {
        category.makingChargesMax = req.body.makingChargesMax;
      }
      if (req.body.makingChargesPercentDefault !== undefined) {
        category.makingChargesPercentDefault = req.body.makingChargesPercentDefault;
      }
      if (req.body.makingChargesPercentByMaterial !== undefined) {
        category.makingChargesPercentByMaterial = req.body.makingChargesPercentByMaterial;
      }

      if (
        typeof category.makingChargesMin === 'number' &&
        typeof category.makingChargesMax === 'number' &&
        category.makingChargesMax < category.makingChargesMin
      ) {
        return res
          .status(400)
          .json({ message: 'makingChargesMax must be greater than or equal to makingChargesMin' });
      }

      const updatedCategory = await category.save();
      res.json(updatedCategory);
    } else {
      res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      res.status(404).json({ message: 'Category not found' });
    } else {
      res.status(500).json({ message: 'Server Error' });
    }
  }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (category) {
      await category.deleteOne();
      res.json({ message: 'Category removed' });
    } else {
      res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    console.error(error);
    if (error.kind === 'ObjectId') {
      res.status(404).json({ message: 'Category not found' });
    } else {
      res.status(500).json({ message: 'Server Error' });
    }
  }
};

export {
  getCategories,
  getCategoryById,
  getCategoryProducts,
  createCategory,
  updateCategory,
  deleteCategory,
};
