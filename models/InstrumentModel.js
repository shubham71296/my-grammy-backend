
const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema({
  key: { type: String },        
  url: { type: String },       
  originalName: { type: String },           
  mimeType: { type: String },
  size: { type: Number },
}, { _id: false });

const InstrumentSchema = new mongoose.Schema(
  {
    instrument_title: { type: String },
    instrument_price: { type: Number },
    instrurment_description: { type: String },
    instrument_images: { type: [ImageSchema], default: [] },
    // stripeProductId: { type: String, default: null },
    // stripePriceId: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("instruments", InstrumentSchema);
