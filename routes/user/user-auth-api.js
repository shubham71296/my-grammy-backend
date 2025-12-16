const express = require('express');
const router = express.Router();
const upload = require("../../middleware/upload");
const UserAuthCtrl = require("./user-ctrl/user-auth-api-ctrl");
const auth = require('../../middleware/auth');

router.post('/signup', UserAuthCtrl.Signup); //Signin
router.post('/signin', UserAuthCtrl.Signin);
router.get('/getcurrentuser', auth, UserAuthCtrl.GetCurrentUser);

module.exports.router = router;