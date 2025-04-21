const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            required: [true, 'Booking must belong to a user!'],
        },
        orderItems: [
            {
                name: {
                    type: String,
                    required: [true, 'Each product must have a name.'],
                },
                quantity: { type: Number, default: 1 },
                price: {
                    type: Number,
                    required: [true, 'Each product must have a price.'],
                },
                product: {
                    type: mongoose.Schema.ObjectId,
                    ref: 'Product',
                    required: [true, 'Order must belong to a product!'],
                },
                _id: false,
            },
        ],
        totalPrice: {
            type: Number,
            required: [true, 'Order must have a price.'],
        },
        orderStatus: {
            type: String,
            enum: ['placed', 'packed', 'shipped', 'deleviered', 'canceled'],
            default: 'placed',
        },
        paymentMethod: {
            type: String,
            required: [true, 'Order must have a payment method.'],
        },
        shippingAddress: {
            address: { type: String, required: true },
            city: { type: String, required: true },
            postalCode: { type: String, default: '' },
            country: { type: String, required: true },
        },
        paymentIntentId: {
            type: String,
            required: true,
        },
        isPaid: {
            type: Boolean,
            default: true,
        },
        isDelivered: {
            type: Boolean,
            default: false,
        },
        deliveredAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    },
);

orderSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'user',
        select: 'name email',
    });
    next();
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
