const Product = require('../models/productModel');
const factory = require('./handlerFactory');
const upload = require('../utils/multer');
const cloudinary = require('../utils/cloudinary');
const AppError = require('../utils/appError');

exports.uploadProductImages = upload.array('images', 10);

exports.resizeProductImages = (req, res, next) => {
    if (!req.files) return next();
    req.body.images = [];
    req.files.map((file, i) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'products',
                public_id: `product-${req.params.id}-${Date.now()}-${i + 1}`,
                format: 'jpeg',
                transformation: [{ quality: 90 }],
            },
            (error, result) => {
                if (error)
                    return next(new AppError('Image upload failed', 500));
                // Store the Cloudinary URL
                req.body.images.push(result.secure_url);
            },
        );
        uploadStream.end(file.buffer);
    });
    next();
};

exports.getAllProducts = factory.getAll(Product);
exports.getProduct = factory.getOne(Product);
exports.addProduct = factory.createOne(Product);
exports.updateProduct = factory.updateOne(Product);
exports.deleteProduct = factory.deleteOne(Product);
