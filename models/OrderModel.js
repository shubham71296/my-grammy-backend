const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true },
  userEmail: { type: String },
  items: [
    {
      productId: mongoose.Schema.Types.ObjectId,
      productType: { type: String },
      title: String,
      qty: Number,
      price: Number,
      thumbnail: { type: Array, default: null }
    }
  ],

  amount: Number,
  currency: { type: String, default: "INR" },
  stripeSessionId: String,
  paymentStatus: { type: String, enum: ["pending", "paid", "failed"], default: "pending" }
}, { timestamps: true });

module.exports = mongoose.model("orders", OrderSchema);
