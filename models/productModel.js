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
        priceDiscount: {
            type: Number,
            validate: {
                validator: function (val) {
                    // this only points to current doc on NEW document creation, Does Not work with update
                    return val < this.price;
                },
                message:
                    'Discount price ({VALUE}) should be below regular price',
            },
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

// I will do indexing later if neccessery ..

// Virtual populate for reviews on single product later ..

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
