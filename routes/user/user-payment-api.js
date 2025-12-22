const express = require('express');
const router = express.Router();
const UserPaymentApiCtrl = require("./user-ctrl/user-payment-api-ctrl");
const auth = require('../../middleware/auth');

router.post('/create-checkout-session', auth, UserPaymentApiCtrl.CreateCheckoutSession);


module.exports.router = router;