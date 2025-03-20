const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please tell us your name'],
    },
    email: {
        type: String,
        required: [true, 'Please your email'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please prvide a valid email'],
    },
    phone: {
        type: String,
        validate: [
            validator.isMobilePhone,
            'Please provide valid phone number',
        ],
    },
    photo: String,
    address: String,
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8,
        select: false,
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            // does not work on update
            validator: function (el) {
                return el === this.password;
            },
            message: 'Passwords are not the same',
        },
    },
    isVerified: {
        type: Boolean,
        default: false,
        select: false,
    },
    active: {
        type: Boolean,
        default: true,
        select: false,
    },
    verificationToken: String,
    verificationTokenExpires: Date,
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
});

// Hash the password and save the timestamp
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
    if (!this.isNew) {
        this.passwordChangedAt = Date.now() - 1000;
    }
    next();
});

userSchema.pre(/^find/, function (next) {
    this.find({ active: true }).select('-__v');
    next();
});

userSchema.methods.comparePassword = async function (
    candidatePassword,
    userPassword,
) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.createVerificationToken = function () {
    // Unencrypted
    const verifyToken = crypto.randomBytes(32).toString('hex');

    // Encrypt and save
    this.verificationToken = crypto
        .createHash('sha256')
        .update(verifyToken)
        .digest('hex');
    this.verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000;
    return verifyToken;
};

userSchema.methods.createPasswordResetToken = function () {
    // Unencrypted reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Encrypted reset token saved in the DB
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    return resetToken;
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
