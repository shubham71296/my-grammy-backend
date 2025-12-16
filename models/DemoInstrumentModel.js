// const DemoInstrumentSchema = new mongoose.Schema(
//   {
//     instrument_title: { type: String },
//     instrument_price: { type: String },
//     instrurment_description: { type: String },
//     instrument_images: [
//       {
//         name: { type: String },
//         type: { type: String },
//         size: { type: Number },
//         base64: { type: String },
//       },
//     ],
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("demoinstruments", DemoInstrumentSchema);


const mongoose = require("mongoose");

const ImageSchema = new mongoose.Schema({
  key: { type: String },        // S3 key or path
  url: { type: String },        // public or signed URL
  originalName: { type: String },               // original filename
  mimeType: { type: String },
  size: { type: Number },
}, { _id: false });

const DemoInstrumentSchema = new mongoose.Schema(
  {
    instrument_title: { type: String },
    instrument_price: { type: String },
    instrurment_description: { type: String },
    instrument_images: [
     { type: [ImageSchema], default: [] }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("demoinstruments", DemoInstrumentSchema);
