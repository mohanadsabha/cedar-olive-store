const Product = require('../models/productModel');
const factory = require('./handlerFactory');
const upload = require('../utils/multer');
const cloudinary = require('../utils/cloudinary');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

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

exports.getAllProducts = factory.getAll(Product);
exports.getProduct = factory.getOne(Product);
exports.addProduct = factory.createOne(Product);
exports.updateProduct = factory.updateOne(Product);
exports.deleteProduct = factory.deleteOne(Product);
