const crypto = require("crypto");
const OrderModel = require("../models/OrderModel");
const CartModel = require("../models/CartModel");

function verifyPaymentSignature(orderId, paymentId, signature) {
  if (!orderId || !paymentId || !signature) return false;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

/**
 * Mark pending order paid and clear cart. Idempotent.
 * @returns {{ processed: boolean, order: object|null }}
 */
async function capturePaidOrder(
  { razorpayOrderId, razorpayPaymentId, userId },
  session = null
) {
  const query = {
    razorpayOrderId,
    paymentStatus: { $ne: "paid" },
  };
  if (userId) query.userId = userId;

  const order = await OrderModel.findOneAndUpdate(
    query,
    {
      paymentStatus: "paid",
      razorpayPaymentId,
    },
    { new: true, session }
  );

  if (!order) {
    return { processed: false, order: null };
  }

  await CartModel.findOneAndUpdate(
    { userId: order.userId },
    { items: [] },
    { session }
  );

  return { processed: true, order };
}

module.exports = { verifyPaymentSignature, capturePaidOrder };
