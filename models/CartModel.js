

// models/cart.js
const mongoose = require("mongoose");


const ImageSchema = new mongoose.Schema({
  key: { type: String },        
  url: { type: String },        
  originalName: { type: String },              
  mimeType: { type: String },
  size: { type: Number },
}, { _id: false });

const CartItemSchema = new mongoose.Schema(
  {
    productType: {
      type: String,
      required: true,
      enum: ["instruments", "course_masters"]
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "items.productType"
    },
    title: String,
    price: Number,
    accessReason: { type: String, default: "" },
    thumbnail: { type: [ImageSchema], default: null },
    qty: { type: Number, default: 1 }
  },
  { _id: false }
);

const CartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "users", required: true, unique: true },
    items: { type: [CartItemSchema], default: [] }
  },
  { timestamps: true }
);

module.exports = mongoose.model("carts", CartSchema);

