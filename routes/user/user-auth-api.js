const express = require('express');
const router = express.Router();
const UserAuthCtrl = require("./user-ctrl/user-auth-api-ctrl");
const auth = require('../../middleware/auth');
const { rateLimit } = require('../../middleware/rateLimit');

const authLimiter = rateLimit({ windowMs: 60_000, max: 15, keyPrefix: 'auth' });

router.post('/signup', authLimiter, UserAuthCtrl.Signup); 
router.post('/signin', authLimiter, UserAuthCtrl.Signin);
router.get('/getcurrentuser', auth, UserAuthCtrl.GetCurrentUser);
router.post('/sendotpemail', authLimiter, UserAuthCtrl.UserSendOtpToEmail); 
router.post('/verifyotp', authLimiter, UserAuthCtrl.UserVerifyOtp); 
router.post('/changepassword', authLimiter, UserAuthCtrl.UserChangePassword);

module.exports.router = router;