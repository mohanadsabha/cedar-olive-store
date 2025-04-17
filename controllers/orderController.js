const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// const Product = require('../models/productModel');
const Order = require('../models/orderModel');
// const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.createCheckoutSession = catchAsync(async (req, res, next) => {
    const productData = req.body.products;
    if (!productData || productData.length === 0) {
        return res
            .status(400)
            .json({ status: 'fail', message: 'No products selected' });
    }

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
        _id: product._id,
        name: product.name, // if not used in the webhook delete
    }));

    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
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
