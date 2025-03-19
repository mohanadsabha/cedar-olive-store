const express = require('express');
const authContoller = require('../controllers/authController');
const userController = require('../controllers/userController');

const router = express.Router();

router.post('/login', authContoller.login);
router.post('/signup', authContoller.signup);
router.patch('/verify/:token', authContoller.verify);
router.post('/resendVerify', authContoller.resendVerify);
router.post('/forgotPassword', authContoller.forgotPassword);
router.patch('/resetPassword/:token', authContoller.resetPassword);

// The below routes will be protected
router.use(authContoller.protect);

router.get('/me', userController.getMe, userController.getUser);
router.patch('/updateMe', userController.updateMe);
router.patch('/updateMyPassword', authContoller.updatePassword);
router.delete('/deleteMe', userController.deleteMe);

// Admin Only
router.use(authContoller.restrictTo('admin'));

router
    .route('/')
    .get(userController.getAllUsers)
    .post(userController.createUser);
router
    .route('/:id')
    .get(userController.getUser)
    .patch(userController.updateUser)
    .delete(userController.deleteUser);

module.exports = router;
