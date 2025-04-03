const Review = require('../models/reviewModel');
const factory = require('./handlerFactory');

exports.setProductUserIds = (req, res, next) => {
    // This allowes nested routes to create review on a product
    if (!req.body.user) req.body.user = req.user.id;
    if (!req.body.product) req.body.product = req.params.productId;
    next();
};

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
