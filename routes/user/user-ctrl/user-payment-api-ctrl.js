const Razorpay = require("razorpay");
const mongoose = require("mongoose");
const CartModel = require("../../../models/CartModel");
const OrderModel = require("../../../models/OrderModel");
const {
  buildValidatedCartItems,
  cartSnapshotChanged,
} = require("../../../utils/cartValidation");
const {
  verifyPaymentSignature,
  capturePaidOrder,
} = require("../../../utils/razorpayPayment");

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

    const { items: validatedItems, totalAmount, changed } =
      await buildValidatedCartItems(cart);

    if (validatedItems.length === 0) {
      return res.status(400).json({
        success: false,
        msg: "Cart contains invalid or removed products",
      });
    }

    if (totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        msg: "Invalid payable amount",
      });
    }

    if (changed) {
      cart.items = validatedItems;
      await cart.save();
    }

    let order = await OrderModel.findOne({
      userId,
      paymentStatus: "pending",
    });

    let razorpayOrderId;

    const cartChanged =
      order &&
      cartSnapshotChanged(order.items, validatedItems, totalAmount, order.amount);

    if (order && cartChanged) {
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
      });
      order.items = validatedItems;
      order.amount = totalAmount;
      order.razorpayOrderId = razorpayOrder.id;
      await order.save();
      razorpayOrderId = razorpayOrder.id;
    } else if (order) {
      razorpayOrderId = order.razorpayOrderId;
    } else {
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        receipt: `rcpt_${Date.now()}`,
      });

      razorpayOrderId = razorpayOrder.id;

      order = await OrderModel.create({
        userId,
        userEmail: req.user.em,
        items: validatedItems,
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

const VerifyPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user.id;
    const {
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
    } = req.body;

    if (
      !verifyPaymentSignature(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      )
    ) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, msg: "Invalid payment signature" });
    }

    const pending = await OrderModel.findOne({
      userId,
      razorpayOrderId,
      paymentStatus: "pending",
    }).session(session);

    if (!pending) {
      const paid = await OrderModel.findOne({
        userId,
        razorpayOrderId,
        paymentStatus: "paid",
      });
      await session.commitTransaction();
      return res.status(200).json({
        success: true,
        msg: paid ? "Payment already confirmed" : "Order not found",
        data: { alreadyProcessed: true },
      });
    }

    const { processed } = await capturePaidOrder(
      {
        razorpayOrderId,
        razorpayPaymentId,
        userId,
      },
      session
    );

    await session.commitTransaction();
    return res.status(200).json({
      success: true,
      msg: processed ? "Payment verified" : "Already processed",
      data: { processed },
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("VerifyPayment error:", err);
    return res.status(500).json({
      success: false,
      msg: "Payment verification failed",
    });
  } finally {
    session.endSession();
  }
};

module.exports = {
  CreateCheckoutSession,
  VerifyPayment,
};
