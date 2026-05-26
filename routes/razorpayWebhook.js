const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");
const router = express.Router();

const OrderModel = require("../models/OrderModel");
const { capturePaidOrder } = require("../utils/razorpayPayment");

router.post("/razorpay", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const receivedSignature = req.headers["x-razorpay-signature"];

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.body)
      .digest("hex");

    if (receivedSignature !== expectedSignature) {
      await session.abortTransaction();
      console.error("Razorpay signature mismatch");
      return res.status(400).send("Invalid signature");
    }

    const event = JSON.parse(req.body.toString());

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;

      const { processed } = await capturePaidOrder(
        {
          razorpayOrderId: payment.order_id,
          razorpayPaymentId: payment.id,
        },
        session
      );

      await session.commitTransaction();
      return res
        .status(200)
        .send(processed ? "Payment captured" : "Already processed");
    }

    if (event.event === "payment.failed") {
      await OrderModel.findOneAndUpdate(
        {
          razorpayOrderId: event.payload.payment.entity.order_id,
          paymentStatus: "pending",
        },
        {
          paymentStatus: "failed",
          razorpayPaymentId: event.payload.payment.entity.id,
        },
        { session }
      );
      await session.commitTransaction();
      return res.status(200).send("Payment failed");
    }

    await session.commitTransaction();
    res.status(200).send("Webhook processed");
  } catch (err) {
    await session.abortTransaction();
    console.error("Razorpay webhook error:", err);
    res.status(500).send("Webhook error");
  } finally {
    session.endSession();
  }
});

module.exports = router;
