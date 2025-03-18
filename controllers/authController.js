const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const signToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    const cookieOptions = {
        expires: new Date(
            Date.now() +
                process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
        ),
        httpOnly: true,
    };
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    res.cookie('jwt', token, cookieOptions);

    // Remove password from output without saving
    user.password = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user,
        },
    });
};

const sendVerificationEmail = catchAsync(async (user, req, res, next) => {
    // Generate random token
    const verifyToken = user.createVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Send verification Email..
    const verifyURL = `${req.protocol}://${req.get('host')}/api/v1/users/verify/${verifyToken}`;
    const message = `<a href="${verifyURL}">Click here to verify your email</a><br><p>Available for 24 hours only<p>`;
    try {
        await sendEmail({
            email: user.email,
            subject: 'Your Email Verification Link',
            message,
        });
        res.status(200).json({
            status: 'success',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                },
            },
        });
    } catch (err) {
        return next(
            new AppError(
                'There was an error sending verification email, try again later!',
                500,
            ),
        );
    }
});

exports.signup = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        address: req.body.address,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        role: req.body.role,
    });
    sendVerificationEmail(newUser, req, res, next);
});

exports.verifyAccount = catchAsync(async (req, res, next) => {
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');
    const user = await User.findOne({
        verificationToken: hashedToken,
        verificationTokenExpires: { $gt: Date.now() },
    });
    if (!user) {
        return next(new AppError('Token is invalid or expired', 400));
    }
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });
    res.status(200).json({
        status: 'success',
        data: {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                isVerified: user.isVerified,
            },
        },
    });
});

exports.resendVerify = catchAsync(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppError('Invalid email', 401));
    }
    if (user.isVerified) {
        res.status().json({});
    }
    sendVerificationEmail(user, req, res, next);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return next(new AppError('Please provide email and password!', 400));
    }
    const user = await User.findOne({ email }).select('+password');
    if (
        !user ||
        !user.isVerified ||
        !(await user.comparePassword(password, user.password))
    ) {
        return next(new AppError('Invalid email or password!', 401));
    }
    createSendToken(user, 200, res);
});
