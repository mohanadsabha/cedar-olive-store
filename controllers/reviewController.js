const Review = require('../models/reviewModel');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const cache = require('../utils/cacheManager');

exports.setProductUserIds = (req, res, next) => {
    // This allowes nested routes to create review on a product
    if (!req.body.user) req.body.user = req.user.id;
    if (!req.body.product) req.body.product = req.params.productId;
    next();
};

exports.invalidateProductCacheOnReview = catchAsync(async (req, res, next) => {
    const productId = req.params.productId
        ? req.params.productId
        : req.params.id;
    const key = cache.generateKey('product', productId);
    await cache.del(key);
    await cache.delPattern('products:*');
    next();
});

exports.checkReviewOwnership = catchAsync(async (req, res, next) => {
    const review = await Review.findById(req.params.id);

    if (!review) {
        return next(new AppError('Review not found', 404));
    }

    // Only review owner or admin can proceed
    if (
        review.user._id.toString() !== req.user.id &&
        req.user.role !== 'admin'
    ) {
        return next(new AppError('You do not have permission to do this', 403));
    }

    next();
});

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
