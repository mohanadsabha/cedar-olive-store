const express = require('express');
const authContoller = require('../controllers/authController');
// const userContoller = require('../controllers/userController');

const router = express.Router();

router.post('/signup', authContoller.signup);
router.post('/verify/:token', authContoller.verifyAccount);
router.post('/resendVerify', authContoller.resendVerify);
router.post('/login', authContoller.login);
// router.post('/forgotPassword', authContoller.forgotPassword);
// router.patch('/resetPassword/:token', authContoller.resetPassword);

module.exports = router;
