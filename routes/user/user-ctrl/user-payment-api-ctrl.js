const Razorpay = require("razorpay");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const CartModel = require("../../../models/CartModel");
const OrderModel = require("../../../models/OrderModel");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const CreateCheckoutSession = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await CartModel.findOne({ userId });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, msg: "Cart is empty" });
    }

    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    );

    if (totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        msg: "Invalid payable amount",
      });
    }

    let order = await OrderModel.findOne({
      userId,
      paymentStatus: "pending",
    });

    let razorpayOrderId;

    if (order) {
      razorpayOrderId = order.razorpayOrderId;
    } else {
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100), // paise
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
      });

      razorpayOrderId = razorpayOrder.id;

      order = await OrderModel.create({
        userId,
        userEmail: req.user.em,
        items: cart.items.map((i) => ({
          productId: i.productId,
          productType: i.productType,
          title: i.title,
          qty: i.qty,
          price: i.price,
          thumbnail: i.thumbnail || null,
        })),
        amount: totalAmount,
        currency: "INR",
        razorpayOrderId,
        paymentStatus: "pending",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        razorpayOrderId,
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        key: process.env.RAZORPAY_KEY_ID,
        orderId: order._id,
      },
    });
  } catch (err) {
    console.error("CreateCheckoutSession error:", err);
    return res.status(500).json({
      success: false,
      msg: "Failed to create Razorpay order",
    });
  }
};

module.exports = {
  CreateCheckoutSession,
};
