const express = require('express');
const contactController = require('../controllers/contactController');
const authContoller = require('../controllers/authController');

const router = express.Router();

router.post('/', contactController.submitContactForm);

// Admin Only
router.use(authContoller.protect, authContoller.restrictTo('admin'));

router.get('/', contactController.getAllContacts);
router
    .route('/:id')
    .get(contactController.getContact)
    .patch(contactController.updateContact)
    .delete(contactController.deleteContact);

module.exports = router;
