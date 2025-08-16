const Product = require('../models/productModel');
const factory = require('./handlerFactory');
const upload = require('../utils/multer');
const cloudinary = require('../utils/cloudinary');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const cache = require('../utils/cacheManager');
const APIFeatures = require('../utils/apiFeatures');

exports.uploadProductImages = upload.array('images', 6);

exports.resizeProductImages = catchAsync(async (req, res, next) => {
    if (!req.files || req.files.length === 0) return next();
    const uploadPromises = req.files.map(
        (file, i) =>
            new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'products',
                        public_id: `product-${req.params.id}-${Date.now()}-${i + 1}`,
                        format: 'jpeg',
                        transformation: [{ quality: 90 }],
                    },
                    (error, result) => {
                        if (error)
                            return reject(
                                new AppError('Image upload failed', 500),
                            );
                        resolve(result.secure_url);
                    },
                );
                uploadStream.end(file.buffer);
            }),
    );
    req.body.images = await Promise.all(uploadPromises);
    next();
});

/**
 * TODO: FIX DELETING PRODUCTS LIST CACHE & TEST FOR REVIEWS INVALIDATION
 */
exports.invalidateProductCache = catchAsync(async (req, res, next) => {
    if (req.params.id) {
        const key = cache.generateKey('product', req.params.id);
        await cache.del(key);
    }
    await cache.delPattern('products:*');
    next();
});

exports.getAllProducts = catchAsync(async (req, res, next) => {
    const key = cache.generateKey('products', null, req.query);
    let cached = await cache.get(key);

    if (!cached) {
        const features = new APIFeatures(Product.find({}), req.query)
            .filter()
            .sort()
            .limitFields()
            .paginate();

        const products = await features.query;
        cached = { results: products.length, data: products };
        await cache.set(key, cached, 43200);
    }

    res.status(200).json({
        status: 'success',
        results: cached.results,
        data: cached.data,
    });
});

exports.getProduct = catchAsync(async (req, res, next) => {
    const key = cache.generateKey('product', req.params.id);
    let product = await cache.get(key);

    if (!product) {
        product = await Product.findById(req.params.id).populate({
            path: 'reviews',
        });
        if (!product) {
            return next(new AppError('No product found with that id', 404));
        }
        await cache.set(key, product, 3600);
    }

    return res.status(200).json({
        status: 'success',
        data: product,
    });
});

exports.addProduct = factory.createOne(Product);
exports.updateProduct = factory.updateOne(Product);
exports.deleteProduct = factory.deleteOne(Product);
