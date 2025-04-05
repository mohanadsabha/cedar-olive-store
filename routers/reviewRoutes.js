const express = require('express');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');

const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router
    .route('/')
    .get(reviewController.getAllReviews)
    .post(
        authController.restrictTo('user'),
        reviewController.setProductUserIds,
        reviewController.createReview,
    );

router
    .route('/:id')
    .get(reviewController.getReview)
    .patch(reviewController.checkReviewOwnership, reviewController.updateReview)
    .delete(
        reviewController.checkReviewOwnership,
        reviewController.deleteReview,
    );

module.exports = router;
