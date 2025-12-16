// const mongoose = require("mongoose");

// const InstrumentSchema = new mongoose.Schema(
//   {
//     instrument_title: { type: String },
//     instrument_price: { type: String },
//     instrurment_description: { type: String },
//     instrument_images: [
//       {
//         name: { type: String },
//         type: { type: String },
//         size: { type: Number },
//         url: { type: String }
//         // base64: { type: String },
//       },
//     ],
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("instruments", InstrumentSchema);


const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema({
  key: { type: String },        // S3 key or path
  url: { type: String },        // public or signed URL
  originalName: { type: String },               // original filename
  mimeType: { type: String },
  size: { type: Number },
}, { _id: false });

const InstrumentSchema = new mongoose.Schema(
  {
    instrument_title: { type: String },
    instrument_price: { type: Number },
    instrurment_description: { type: String },
    instrument_images: { type: [ImageSchema], default: [] },
    stripeProductId: { type: String, default: null },
    stripePriceId: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("instruments", InstrumentSchema);
