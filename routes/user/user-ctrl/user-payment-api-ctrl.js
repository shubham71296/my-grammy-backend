const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const CartModel = require("../../../models/CartModel");
const OrderModel = require("../../../models/OrderModel");
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const CreateCheckoutSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { discount = 0 } = req.body;

    const cart = await CartModel.findOne({ userId });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, msg: "Cart is empty" });
    }

    let subtotal = 0;
    cart.items.forEach(item => {
      subtotal += item.price * item.qty;
    });

    const appliedDiscount = Math.min(discount, subtotal);
    // 🔹 3. Final amount
    // const total = subtotal - appliedDiscount;
    const total = subtotal;

    // Prepare Stripe line items


    const lineItems = cart.items.map(item => {
      const imageUrl = item.thumbnail?.[0]?.url || null;

      return {
        price_data: {
          currency: "inr",
          product_data: {
            name: item.title,
            images: imageUrl ? [imageUrl] : []    // <---- thumbnail added
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.qty,
      };
    });
    // const lineItems = cart.items.map(item => ({
    //   price_data: {
    //     currency: "inr",
    //     product_data: { name: item.title },
    //     unit_amount: Math.round(item.price * 100),
    //   },
    //   quantity: item.qty,
    // }));


    // Optional: add discount as negative line item
    // if (appliedDiscount > 0) {
    //   lineItems.push({
    //     price_data: {
    //       currency: "inr",
    //       product_data: { name: "Discount" },
    //       unit_amount: -Math.round(appliedDiscount * 100),  // FIXED
    //     },
    //     quantity: 1,
    //   });
    // }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: `${process.env.FRONTEND_URL}/user/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/user/cart`,
      customer_email: req.user.em,
    });

    // Create pending order in DB
    const orderItems = cart.items.map(i => ({
      productId: i.productId,
      productType: i.productType,
      qty: i.qty,
      price: i.price,
      title: i.title,
      thumbnail: i.thumbnail || null
    }));

    await OrderModel.create({
      userId,
      userEmail: req.user.em,
      items: orderItems,
      amount: total, // total from frontend order summary
      currency: "INR",
      stripeSessionId: session.id,
      paymentStatus: "pending",
    });

    return res.status(200).json({ success: true, url: session.url });
  } catch (err) {
    console.log("Checkout error:", err);
    return res.status(500).json({ success: false, msg: "Error creating checkout session" });
  }
};

const VerifyPayment = async (req, res) => {
 try {
    let sessionId = req.params.session_id; 
    console.log("sessionId from FE:", sessionId);

    // Extra safety decode
    // sessionId = decodeURIComponent(sessionId);

    const order = await OrderModel.findOne({ stripeSessionId: sessionId }); //stripeSessionId

    if (!order) {
      return res.status(404).json({
        error:"",
        success: false,
        msg: "Order not found",
      });
    }

    return res.json({
      error:"",
      success: true,
      paymentStatus: order.paymentStatus,
      order,
    });
  } catch (err) {
    return res.status(500).json({ error:"internal server error", success: false, msg: "Server error" });
  }
};





module.exports = {
  CreateCheckoutSession,
  VerifyPayment
};

