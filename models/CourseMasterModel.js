const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema(
  {
    key: { type: String },
    url: { type: String },
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
  },
  { _id: false } // don't create subdocument _id unless you want it
);

const CourseMasterSchema = new mongoose.Schema(
  {
    instrument: { type: mongoose.Schema.Types.ObjectId, ref: "instruments" },
    course_title: { type: String },
    course_description: { type: String },
    course_price: { type: String },
    thumbnail_image: {
      type: [FileSchema],
      default: null, // or [] if you prefer empty array
    },
    stripeProductId: { type: String, default: null },
    stripePriceId: { type: String, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("course_masters", CourseMasterSchema);
