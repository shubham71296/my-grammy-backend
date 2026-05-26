const CourseMasterModel = require("../models/CourseMasterModel");
const LectureModel = require("../models/LectureModel");
const { collectS3Keys, normalizeFileList } = require("./normalizeMedia");

/**
 * Collect all S3 keys for an instrument and its courses/lectures.
 */
async function collectInstrumentCascadeKeys(instrument) {
  const instrumentId = instrument._id;
  const keys = collectS3Keys(instrument.instrument_images || []);

  const courses = await CourseMasterModel.find({ instrument: instrumentId }).lean();
  const courseIds = courses.map((c) => c._id);

  for (const course of courses) {
    keys.push(...collectS3Keys(course.thumbnail_image || []));
  }

  if (courseIds.length) {
    const lectures = await LectureModel.find({ course: { $in: courseIds } }).lean();
    for (const lecture of lectures) {
      keys.push(...collectS3Keys(lecture.lecture_video || []));
    }
  }

  return { courseIds, keys: [...new Set(keys.filter(Boolean))] };
}

module.exports = { collectInstrumentCascadeKeys, normalizeFileList };
