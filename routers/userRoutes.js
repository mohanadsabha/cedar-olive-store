const express = require('express');
const authContoller = require('../controllers/authController');
// const userContoller = require('../controllers/userController');

const router = express.Router();

router.post('/login', authContoller.login);
router.post('/signup', authContoller.signup);
router.patch('/verify/:token', authContoller.verify);
router.post('/resendVerify', authContoller.resendVerify);
router.post('/forgotPassword', authContoller.forgotPassword);
router.patch('/resetPassword/:token', authContoller.resetPassword);

// The below routes will be protected
router.use(authContoller.protect);

// router.get('/me', userContoller.getMe, userContoller.getUser);
// router.patch('/updateMyPassword', authContoller.updatePassword);
// router.patch('/updateMe', userContoller.updateMe);
// router.delete('/deleteMe', userContoller.deleteMe);

// Admin Only
router.use(authContoller.restrictTo('admin'));

// router.route('/').get(userContoller.getAllUsers).post(userContoller.createUser);
// router
//     .route('/:id')
//     .get(userContoller.getUser)
//     .patch(userContoller.updateUser)
//     .delete(userContoller.deleteUser);

module.exports = router;
