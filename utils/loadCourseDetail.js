const CourseMasterModel = require("../models/CourseMasterModel");
const LectureModel = require("../models/LectureModel");
const { getPurchasedCourseIdSet } = require("./coursePurchase");

/**
 * Load course + lectures with purchase flag for authenticated users.
 * @param {string} id - course id
 * @param {{ id?: string, role?: string } | null} user - req.user or null for guest
 */
async function loadCourseDetail(id, user = null) {
  const course_data = await CourseMasterModel.findById(id)
    .populate({ path: "instrument", select: "instrument_title" })
    .lean();

  if (!course_data) return null;

  const lectures_data = await LectureModel.find({ course: id }).lean();

  let isPurchased = false;
  if (user?.role === "admin") {
    isPurchased = true;
  } else if (user?.id) {
    const purchasedSet = await getPurchasedCourseIdSet(user.id);
    isPurchased = purchasedSet.has(id.toString());
  }

  return {
    course_data: { ...course_data, isPurchased },
    lectures_data,
  };
}

module.exports = { loadCourseDetail };
