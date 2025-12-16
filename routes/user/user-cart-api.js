const express = require('express');
const router = express.Router();
const UserCartApiCtrl = require("./user-ctrl/user-cart-api-ctrl");
const auth = require('../../middleware/auth');

router.post('/addtocart', auth, UserCartApiCtrl.AddToCart);
router.get('/getcartitems', auth, UserCartApiCtrl.GetFromCart); //Signin
router.post('/increasequantity', auth, UserCartApiCtrl.IncreaseCartQuantity);
router.post('/decreasequantity', auth, UserCartApiCtrl.DecreaseCartQuantity);
router.post('/removefromcart', auth, UserCartApiCtrl.RemoveFromCart); //RemoveFromCart

module.exports.router = router;