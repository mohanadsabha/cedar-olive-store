const Contact = require('../models/contactModel');
const catchAsync = require('../utils/catchAsync');
const Email = require('../utils/email');
const factory = require('./handlerFactory');

exports.submitContactForm = catchAsync(async (req, res, next) => {
    const { name, email, message } = req.body;
    await Contact.create({ name, email, message });

    await new Email({ name, email }, message).sendContact();

    res.status(201).json({
        status: 'success',
        message: 'Message sent successfully!',
    });
});

exports.getAllContacts = factory.getAll(Contact);
exports.getContact = factory.getOne(Contact);
exports.updateContact = factory.updateOne(Contact);
exports.deleteContact = factory.deleteOne(Contact);
