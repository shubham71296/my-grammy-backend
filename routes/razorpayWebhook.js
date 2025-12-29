const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const OrderModel = require("../models/OrderModel");
const CartModel = require("../models/CartModel");

/**
 * Razorpay Webhook
 * IMPORTANT:
 * - Route must use express.raw()
 * - Do NOT use express.json() before this route
 */
router.post(
  "/razorpay",
  // express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

      const receivedSignature = req.headers["x-razorpay-signature"];

      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(req.body)
        .digest("hex");

      // ❌ Signature mismatch
      if (receivedSignature !== expectedSignature) {
        console.error("❌ Razorpay signature mismatch");
        return res.status(400).send("Invalid signature");
      }

      const event = JSON.parse(req.body.toString());

      // ✅ Handle payment success
      if (event.event === "payment.captured") {
        const payment = event.payload.payment.entity;

        // const razorpayOrderId = payment.order_id;
        // const razorpayPaymentId = payment.id;

        console.log("💰 Payment Captured:", payment.id);

        // 1️⃣ Update order
        const order = await OrderModel.findOneAndUpdate(
          {
            razorpayOrderId: payment.order_id,
            paymentStatus: { $ne: "paid" },
          },
          {
            paymentStatus: "paid",
            razorpayPaymentId: payment.id,
          },
          { new: true }
        );

        if (!order) {
          console.log("⚠️ Order already paid or not found:");
          return res.status(200).send("Already processed");
        }

        console.log("✔ Order marked as PAID");

        // 2️⃣ Clear cart
        await CartModel.findOneAndUpdate(
          { userId: order.userId },
          { items: [] }
        );

        console.log("🗑 Cart cleared");

        // 3️⃣ TODO (optional)
        // - Grant course access
        // - Send confirmation email
        return res.status(200).send("Payment captured");
      }

      if (event.event === "payment.failed") {
        const payment = event.payload.payment.entity;

        const order = await OrderModel.findOneAndUpdate(
          {
            razorpayOrderId: payment.order_id,
            paymentStatus: "pending",
          },
          {
            paymentStatus: "failed",
            razorpayPaymentId: payment.id,
          }
        );

        if (!order) {
          console.log("⚠️ Failed payment ignored (already paid)");
          return res.status(200).send("Ignored");
        }

        console.log("❌ Payment failed → order marked FAILED");
        return res.status(200).send("Payment failed");
      }

      res.status(200).send("Webhook processed");
    } catch (err) {
      console.error("❌ Razorpay webhook error:", err);
      res.status(500).send("Webhook error");
    }
  }
);

module.exports = router;
