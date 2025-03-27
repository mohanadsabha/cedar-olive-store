const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

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
    // Send verification Email
    try {
        const verifyURL = `${req.protocol}://${req.get('host')}/verify/${verifyToken}`;
        await new Email(user, verifyURL).sendVerification();
        res.status(200).json({
            status: 'success',
            message: 'Verification email sent',
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
        // You can set an admin using the database not from here
    });
    sendVerificationEmail(newUser, req, res, next);
});

exports.verify = catchAsync(async (req, res, next) => {
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
            user,
        },
    });
});

exports.resendVerify = catchAsync(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppError('Invalid email', 401));
    }
    if (user.isVerified) {
        res.status(200).json({
            status: 'success',
            message: 'User is already verified',
        });
    }
    sendVerificationEmail(user, req, res, next);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return next(new AppError('Please provide email and password!', 400));
    }
    const user = await User.findOne({ email }).select('+password +isVerified');
    if (
        !user ||
        !user.isVerified ||
        !(await user.comparePassword(password, user.password))
    ) {
        return next(new AppError('Invalid email or password!', 401));
    }
    createSendToken(user, 200, res);
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return next(new AppError('There is no user with email address', 404));
    }
    // Generate random token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    // send token in email
    try {
        const resetURL = `${req.protocol}://${req.get('host')}/resetPassword/${resetToken}`;
        await new Email(user, resetURL).sendPasswordReset();
        res.status(200).json({
            status: 'success',
            message: 'Token sent to email',
        });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        return next(
            new AppError(
                'There was an error sending the email, try again later!',
                500,
            ),
        );
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    // Get user based on token
    const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
    });
    // Set new password, if token in not expired, user exists
    if (!user) {
        return next(new AppError('Token is invalid or has expired', 400));
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    // log the user in, send jwt
    createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
    // Get the token
    const fullToken = req.headers.authorization;
    let token;
    if (fullToken && fullToken.startsWith('Bearer')) {
        token = fullToken.split(' ')[1];
    }
    if (!token) {
        return next(new AppError('You are not logged in, please log in', 401));
    }
    // Verify the token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    // Check user still exits and didn't change their password after the token sent
    const freshUser = await User.findById(decoded.id);
    if (!freshUser) {
        return next(new AppError('The user does not longer exists', 401));
    }
    if (freshUser.changedPasswordAfter(decoded.iat)) {
        return next(
            new AppError(
                'Password has been recently changed! Please log in again',
                401,
            ),
        );
    }
    // Give access
    req.user = freshUser;
    next();
});

exports.restrictTo =
    (...roles) =>
    (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(
                new AppError(
                    'You do not have permission to perform this action',
                    403,
                ),
            );
        }
        next();
    };

exports.updatePassword = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id).select('+password');
    if (!req.body.currentPassword) {
        return next(new AppError('Please provide your current password', 400));
    }
    // Check for the current password
    if (
        !(await user.comparePassword(req.body.currentPassword, user.password))
    ) {
        return next(new AppError('Your current password is wrong', 401));
    }
    // Update Password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    // Kepp user loged in, Send JWT
    createSendToken(user, 200, res);
});
