const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const AppError = require('./utils/appError');
const globalEerrorHandler = require('./controllers/errorController');
const userRouter = require('./routers/userRoutes');

const app = express();

const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour',
});

// Security headers
app.use(helmet());

// Request rate limiting
app.use('/api', limiter);

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

app.use(express.json({ limit: '10kb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// prevent parameter pollution
// app.use(
//     hpp({
//         whitelist: [
//             // Change White List later !!
//             'duration',
//             'ratingsAverage',
//             'ratingsQuantity',
//             'maxGroupSize',
//             'price',
//         ],
//     }),
// );

// Routes
app.use('/api/v1/users', userRouter);

// Unhandled routes
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Global Error Handeling Middleware, the first arg is err
app.use(globalEerrorHandler);

module.exports = app;
