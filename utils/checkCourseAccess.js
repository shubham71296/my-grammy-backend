const OrderModel = require("../models/OrderModel");
const CourseMasterModel = require("../models/CourseMasterModel");

const checkUserPurchasedCourse = async (userId, courseId) => {
  const paidCourse = await OrderModel.findOne({
    userId,
    paymentStatus: "paid",
    items: {
      $elemMatch: {
        productType: "course_masters",
        productId: courseId,
      },
    },
  });

  if (paidCourse) return true;

  const course = await CourseMasterModel.findById(courseId)
    .select("instrument")
    .lean();

  if (!course?.instrument) return false;

  const paidInstrument = await OrderModel.findOne({
    userId,
    paymentStatus: "paid",
    items: {
      $elemMatch: {
        productType: "instruments",
        productId: course.instrument,
      },
    },
  });

  return !!paidInstrument;
};

module.exports = checkUserPurchasedCourse;
