

// models/cart.js
const mongoose = require("mongoose");


const ImageSchema = new mongoose.Schema({
  key: { type: String },        // S3 key or path
  url: { type: String },        // public or signed URL
  originalName: { type: String },               // original filename
  mimeType: { type: String },
  size: { type: Number },
}, { _id: false });

const CartItemSchema = new mongoose.Schema(
  {
    productType: {
      type: String,
      required: true,
      // This must match the model names you used in mongoose.model(...)
      enum: ["instruments", "course_masters"]
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "items.productType" // note: when nested, refPath references sibling field name inside the same array item
    },
    title: String,
    price: Number,
    //isFreeWithInstrument: { type: Boolean, default: false },
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

