const Contact = require('../models/contactModel');
const catchAsync = require('../utils/catchAsync');
const Email = require('../utils/email');

exports.submitContactForm = catchAsync(async (req, res, next) => {
    const { name, email, message } = req.body;
    await Contact.create({ name, email, message });

    await new Email({ name, email }, message).sendContact();

    res.status(201).json({
        status: 'success',
        message: 'Message sent successfully!',
    });
});
