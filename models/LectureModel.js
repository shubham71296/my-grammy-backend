const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema(
  {
    key: { type: String },
    url: { type: String },
    originalName: { type: String },
    mimeType: { type: String },
    size: { type: Number },
  },
  { _id: false }
);

const LectureSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: "course_masters" },
    lecture_title: { type: String },
    lecture_video: {
      type: [FileSchema],
      default: null,
    },
    duration: { type: String, default: null },
  },
  { timestamps: true }
);

LectureSchema.index({ course: 1 });
LectureSchema.index({ course: 1, lecture_title: 1 }, { unique: true });

module.exports = mongoose.model("lectures", LectureSchema);
