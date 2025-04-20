const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/orderModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');
const e = require('express');

exports.createCheckoutSession = catchAsync(async (req, res, next) => {
    const productData = req.body.products;

    console.log('Product data from request:', productData);

    if (!productData) return new AppError('No products selected', 400);

    console.log('Product data:', productData);

    const taxRate = await stripe.taxRates.create({
        display_name: 'Sales Tax',
        description: '6% standard sales tax',
        percentage: 6.0,
        inclusive: false,
    });

    const lineItems = productData.map((product) => ({
        price_data: {
            currency: 'usd',
            product_data: {
                name: product.name,
            },
            unit_amount: Math.round(product.price * 100),
        },
        quantity: product.quantity || 1,
        tax_rates: [taxRate.id],
    }));

    const productMetadata = productData.map((product) => ({
        product: product.id,
        name: product.name,
        quantity: product.quantity || 1,
        price: product.price,
    }));

    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: `${process.env.CLIENT_URL}/payment-success`,
        cancel_url: `${process.env.CLIENT_URL}/payment-cancel`,
        customer_email: req.user.email,
        line_items: lineItems,
        metadata: {
            userId: req.user.id,
            products: JSON.stringify(productMetadata),
        },
        shipping_address_collection: {
            allowed_countries: ['US', 'CA', 'DE', 'FR', 'AU', 'PS'],
        },
    });
    // res.json({ url: session.url }); // Send session id or url only
    res.status(200).json({
        status: 'success',
        session,
    });
});

// const createOrderCheckout = async (session) => {
//     await Order.create({
//         user: session.metadata.userId,
//         orderItems: JSON.parse(session.metadata.products),
//         totalPrice: session.amount_total / 100,
//         paymentMethod,
//         shippingAddress,
//     });
// };

exports.webhookCheckout = (req, res, next) => {
    const signature = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET,
        );
    } catch (err) {
        return new AppError(`Webhook error: ${err.message}`, 400); //try in signatueer
    }

    if (event.type === 'checkout.session.completed') {
        // createOrderCheckout(event.data.object);
        console.log(event.data.object);
        console.log('Payment was successful!');
    }

    res.status(200).json({ received: true });
};

// exports.createOrder = factory.createOne(Order);
exports.getOrder = factory.getOne(Order);
exports.getAllOrders = factory.getAll(Order);
exports.updateOrder = factory.updateOne(Order);
exports.deleteOrder = factory.deleteOne(Order);
