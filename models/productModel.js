const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Product must have a name'],
            trim: true,
            maxlength: [
                100,
                'Product name must have less or equal then 100 characters',
            ],
        },
        brand: {
            type: String,
            required: [true, 'Product must have a brand'],
        },
        category: {
            type: String,
            required: [true, 'Product must have a category'],
        },
        description: {
            type: String,
            trim: true,
            required: [true, 'Product must have a description'],
        },
        images: [String],
        price: {
            type: Number,
            required: [true, 'Product must have a price'],
        },
        ratingsAverage: {
            type: Number,
            default: 4.5,
            min: [1, 'Rating must be above 1.0'],
            max: [5, 'Rating must be below 5.0'],
            set: (val) => Math.round(val * 10) / 10,
        },
        ratingsQuantity: {
            type: Number,
            default: 0,
        },
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

productSchema.index({ category: 1, brand: 1 });

productSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'product',
    localField: '_id',
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
