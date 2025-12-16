// const mongoose = require("mongoose");

// const CourseSchema = new mongoose.Schema(
//   {
//     instrument: { type: mongoose.Schema.Types.ObjectId, ref: "instruments" },
//     course_title: { type: String },
//     course_description: { type: String },
//     course_price: { type: String },
//     course_video: {
//       key: { type: String },
//       url: { type: String },
//       originalName: { type: String },
//       mimeType: { type: String },
//       size: { type: Number },
//     },

//     thumbnail_image: {
//       key: { type: String },
//       url: { type: String },
//       originalName: { type: String },
//       mimeType: { type: String },
//       size: { type: Number },
//     },
//     duration: { type: String, default: null },
//   },
//   { timestamps: true }
// );

// module.exports = mongoose.model("courses", CourseSchema);


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

const LectureSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "course_masters" },
    lecture_title: { type: String },
    lecture_video: {
      type: [FileSchema],
      default: null, // or [] if you prefer empty array
    },
    duration: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("lectures", LectureSchema);

