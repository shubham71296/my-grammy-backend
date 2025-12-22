const express = require('express');
const router = express.Router();
const upload = require("../../middleware/upload");
const UserAuthCtrl = require("./user-ctrl/user-auth-api-ctrl");
const auth = require('../../middleware/auth');

router.post('/signup', UserAuthCtrl.Signup); 
router.post('/signin', UserAuthCtrl.Signin);
router.get('/getcurrentuser', auth, UserAuthCtrl.GetCurrentUser);
router.post('/sendotpemail', UserAuthCtrl.UserSendOtpToEmail); 
router.post('/verifyotp', UserAuthCtrl.UserVerifyOtp); 
router.post('/changepassword', UserAuthCtrl.UserChangePassword);

module.exports.router = router;