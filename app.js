const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const AppError = require('./utils/appError');
const globalEerrorHandler = require('./controllers/errorController');
const userRouter = require('./routers/userRoutes');
const contactRouter = require('./routers/contactRoutes');
const productRouter = require('./routers/productRoutes');
const reviewRouter = require('./routers/reviewRoutes');
const orderController = require('./controllers/orderController');
const orderRouter = require('./routers/orderRoutes');

const app = express();

app.set('trust proxy', 1);

const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour',
});

app.use(
    cors({
        origin: [
            'http://localhost:3000',
            'https://cedar-olive-store.vercel.app',
        ],
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    }),
);

// Security headers
app.use(helmet());

// Request rate limiting
app.use('/api', limiter);

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Stripe webhook, stripe needs the body as stream
// app.post(
//     '/webhook-checkout',
//     express.raw({ type: 'application/json' }),
//     orderController.webhookCheckout,
// );

app.use(express.json({ limit: '10kb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// prevent parameter pollution
app.use(
    hpp({
        whitelist: [
            'brand',
            'category',
            'ratingsAverage',
            'ratingsQuantity',
            'price',
        ],
    }),
);

app.use(compression());

// Routes
app.use('/api/v1/products', productRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/contact', contactRouter);
app.use('/api/v1/orders', orderRouter);

// Unhandled routes
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Global Error Handeling Middleware, the first arg is err
app.use(globalEerrorHandler);

module.exports = app;
