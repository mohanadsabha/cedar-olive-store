const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/orderModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

exports.createCheckoutSession = catchAsync(async (req, res, next) => {
    const productData = req.body.products;

    if (!productData || productData.length === 0) {
        return next(new AppError('No products selected.', 400));
    }

    productData.forEach((product) => {
        if (!product.name || !product.price || !product.id) {
            return next(
                new AppError(
                    `Invalid product data: ${JSON.stringify(product)}`,
                    400,
                ),
            );
        }
        if (!product.quantity) {
            product.quantity = 1;
        }
    });

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
        quantity: product.quantity,
        tax_rates: [taxRate.id],
    }));

    const productMetadata = productData.map((product) => ({
        product: product.id,
        name: product.name,
        quantity: product.quantity,
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
        billing_address_collection: 'required',
        shipping_address_collection: {
            allowed_countries: ['US', 'CA', 'DE', 'FR', 'AU', 'PS'],
        },
    });
    res.status(200).json({
        status: 'success',
        url: session.url,
    });
});

const createOrderCheckout = catchAsync(async (session) => {
    const shipping = session.customer_details.address;
    const paymentMethod = session.payment_method_types[0] || 'unknown';
    await Order.create({
        user: session.metadata.userId,
        orderItems: JSON.parse(session.metadata.products),
        totalPrice: session.amount_total / 100,
        paymentMethod,
        shippingAddress: {
            address: `${shipping.line1} - ${shipping.line2}`,
            city: shipping.city,
            postalCode: shipping.postal_code,
            country: shipping.country,
        },
        paymentIntentId: session.payment_intent,
    });
});

exports.webhookCheckout = catchAsync(async (req, res, next) => {
    const signature = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET,
        );
    } catch (err) {
        return next(new AppError(`Webhook error: ${err.message}`, 400));
    }

    if (event.type === 'checkout.session.completed') {
        await createOrderCheckout(event.data.object);
    }

    res.status(200).json({ received: true });
});

// exports.createOrder = factory.createOne(Order);
exports.getOrder = factory.getOne(Order);
exports.getAllOrders = factory.getAll(Order);
exports.updateOrder = factory.updateOne(Order);
exports.deleteOrder = factory.deleteOne(Order);
