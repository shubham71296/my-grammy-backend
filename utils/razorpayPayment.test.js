const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert");
const crypto = require("crypto");
const { verifyPaymentSignature } = require("./razorpayPayment");

describe("verifyPaymentSignature", () => {
  const originalSecret = process.env.RAZORPAY_KEY_SECRET;

  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = "test_secret";
  });

  afterEach(() => {
    process.env.RAZORPAY_KEY_SECRET = originalSecret;
  });

  it("returns false when args are missing", () => {
    assert.strictEqual(verifyPaymentSignature("", "pay_1", "sig"), false);
  });

  it("validates signature for order|payment", () => {
    const orderId = "order_abc";
    const paymentId = "pay_xyz";
    const signature = crypto
      .createHmac("sha256", "test_secret")
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    assert.strictEqual(
      verifyPaymentSignature(orderId, paymentId, signature),
      true
    );
  });
});
