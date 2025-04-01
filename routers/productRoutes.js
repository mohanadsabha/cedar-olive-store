const express = require('express');
const productController = require('../controllers/productController');
const authController = require('../controllers/authController');

const router = express.Router();

router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProduct);

router.use(authController.protect, authController.restrictTo('admin'));

// Admin permissions only
router.post('/', productController.addProduct);
router
    .route('/:id')
    .patch(
        productController.uploadProductImages,
        productController.resizeProductImages,
        productController.updateProduct,
    )
    .delete(productController.deleteProduct);

module.exports = router;
