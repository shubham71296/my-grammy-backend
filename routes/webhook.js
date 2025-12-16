// const express = require("express");
// const router = express.Router();
// const CartModel = require("../models/CartModel");
// const OrderModel = require("../models/OrderModel");
// const Stripe = require('stripe');
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// router.post(
//   "/stripe-webhook",
//   express.raw({ type: "application/json" }),
//   async (req, res) => {
//     const sig = req.headers["stripe-signature"];
//     let event;

//     try {
//       event = stripe.webhooks.constructEvent(
//         req.body,
//         sig,
//         process.env.STRIPE_WEBHOOK_SECRET
//       );
//     } catch (err) {
//       console.log("Webhook error:", err.message);
//       return res.status(400).send(`Webhook Error: ${err.message}`);
//     }

//     if (event.type === "checkout.session.completed") {
//       const session = event.data.object;
//       await OrderModel.findOneAndUpdate(
//         { stripeSessionId: session.id },
//         { paymentStatus: "paid" }
//       );
//       console.log(`Payment completed for session: ${session.id}`);
//     }

//     res.status(200).send("Webhook received");
//   }
// );

// module.exports = router;

const express = require("express");
const router = express.Router();
const CartModel = require("../models/CartModel");
const OrderModel = require("../models/OrderModel");
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.log("Webhook error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      console.log("💰 Payment completed for session:", session.id);

      try {
        // 1️⃣ Update the order status to "paid"
        const order = await OrderModel.findOneAndUpdate(
          { stripeSessionId: session.id, paymentStatus: { $ne: "paid" } },
          { paymentStatus: "paid" },
          { new: true }
        );

        if (order) {
          console.log("✔ Order updated to PAID");

          // 2️⃣ Empty the user's cart
          await CartModel.findOneAndUpdate(
            { userId: order.userId },
            { items: [] }
          );
          console.log("🗑️ User's cart has been emptied");
        } else {
          console.log("⚠️ Order not found for session:", session.id);
        }
      } catch (err) {
        console.error("Error updating order/cart:", err);
      }
    }

    // Respond to Stripe
    res.status(200).send("Webhook received");
  }
);

module.exports = router;

