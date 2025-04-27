const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const upload = require('../utils/multer');
const cloudinary = require('../utils/cloudinary');

const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach((el) => {
        if (allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
};

// Users
exports.uploadUserImage = upload.single('photo');

exports.resizeUserImage = (req, res, next) => {
    if (!req.file) return next();
    const uploadStream = cloudinary.uploader.upload_stream(
        {
            folder: 'users',
            public_id: `user-${req.user.id}-${Date.now()}`,
            format: 'jpeg',
            transformation: [
                { width: 500, height: 500, crop: 'fill' },
                { quality: 'auto' },
            ],
        },
        (error, result) => {
            if (error) return next(new AppError('Image upload failed', 500));
            req.file.path = result.secure_url; // Store the Cloudinary URL
            next();
        },
    );
    uploadStream.end(req.file.buffer);
};

exports.updateMe = catchAsync(async (req, res, next) => {
    if (req.body.password || req.body.passwordConfirm) {
        return next(
            new AppError(
                'This route is not for password updates. Please use /updateMyPassword.',
                400,
            ),
        );
    }
    const filteredBody = filterObj(
        req.body,
        'name',
        'email',
        'phone',
        'address',
    );
    if (req.file) filteredBody.photo = req.file.path;
    const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        filteredBody,
        {
            new: true,
            runValidators: true,
        },
    );
    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser,
        },
    });
});

exports.getMe = (req, res, next) => {
    req.params.id = req.user.id;
    next();
};

exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { active: false });
    res.status(204).json({
        status: 'success',
        data: null,
    });
});

// Whishlist
exports.getWishlist = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id).populate('wishlist');

    res.status(200).json({
        status: 'success',
        data: {
            wishlist: user.wishlist,
        },
    });
});

exports.addToWishlist = catchAsync(async (req, res, next) => {
    const { productId } = req.body;

    if (!productId) {
        return next(new AppError('Please provide a productId', 400));
    }

    const user = await User.findByIdAndUpdate(
        req.user.id,
        { $addToSet: { wishlist: productId } },
        { new: true },
    );

    res.status(200).json({
        status: 'success',
        data: {
            wishlist: user.wishlist,
        },
    });
});

exports.removeFromWishlist = catchAsync(async (req, res, next) => {
    const { productId } = req.params;

    await User.findByIdAndUpdate(req.user.id, {
        $pull: { wishlist: productId },
    });

    res.status(204).json({
        status: 'success',
        data: null,
    });
});

// Admin
exports.createUser = (req, res) => {
    res.status(500).json({
        status: 'fail',
        message: 'This route in not defined. Please use /signup instead',
    });
};
exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
