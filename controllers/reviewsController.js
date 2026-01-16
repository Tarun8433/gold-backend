import Product from '../models/Product.js';

const getProductReviews = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select('reviews');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product.reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const addProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({ message: 'rating and comment are required' });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const alreadyReviewed = product.reviews.some(
      (review) => review.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({ message: 'Product already reviewed by this user' });
    }

    const review = {
      user: req.user._id,
      name: req.user.name,
      rating: Number(rating),
      comment,
      helpfulCount: 0,
    };

    product.reviews.push(review);

    product.numReviews = product.reviews.length;
    product.rating =
      product.reviews.reduce((acc, item) => acc + item.rating, 0) /
      product.reviews.length;

    await product.save();

    res.status(201).json(product.reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const updateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const reviewId = req.params.id;

    const product = await Product.findOne({ 'reviews._id': reviewId });

    if (!product) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const review = product.reviews.id(reviewId);

    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this review' });
    }

    if (rating !== undefined) {
      review.rating = Number(rating);
    }

    if (comment !== undefined) {
      review.comment = comment;
    }

    if (rating !== undefined) {
      product.rating =
        product.reviews.reduce((acc, item) => acc + item.rating, 0) /
        product.reviews.length;
    }

    await product.save();

    res.json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.id;

    const product = await Product.findOne({ 'reviews._id': reviewId });

    if (!product) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const review = product.reviews.id(reviewId);

    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    review.remove();

    product.numReviews = product.reviews.length;
    if (product.reviews.length > 0) {
      product.rating =
        product.reviews.reduce((acc, item) => acc + item.rating, 0) /
        product.reviews.length;
    } else {
      product.rating = 0;
    }

    await product.save();

    res.json({ message: 'Review deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const markReviewHelpful = async (req, res) => {
  try {
    const reviewId = req.params.id;

    const product = await Product.findOne({ 'reviews._id': reviewId });

    if (!product) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const review = product.reviews.id(reviewId);

    review.helpfulCount += 1;

    await product.save();

    res.json(review);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export {
  getProductReviews,
  addProductReview,
  updateReview,
  deleteReview,
  markReviewHelpful,
};

