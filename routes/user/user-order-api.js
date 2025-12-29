const express = require('express');
const router = express.Router();
const UserOrderApiCtrl = require("./user-ctrl/user-order-api-ctrl");
const auth = require('../../middleware/auth');

router.post('/getmyorders', auth,  UserOrderApiCtrl.GetMyOrders);


module.exports.router = router;