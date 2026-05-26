const OrderModel = require("../models/OrderModel");

const getPurchasedCourseIdSet = async (userId) => {
  if (!userId) return new Set();
  const purchasedCourseIds = await OrderModel.distinct("items.productId", {
    userId,
    paymentStatus: "paid",
    "items.productType": "course_masters",
  });
  return new Set(purchasedCourseIds.map((id) => id.toString()));
};

const enrichCoursesWithPurchase = async (courses, user) => {
  if (user?.role === "admin") {
    return courses.map((c) => ({ ...c, isPurchased: true }));
  }
  if (!user?.id) {
    return courses.map((c) => ({ ...c, isPurchased: false }));
  }
  const purchasedSet = await getPurchasedCourseIdSet(user.id);
  return courses.map((course) => ({
    ...course,
    isPurchased: purchasedSet.has(course._id.toString()),
  }));
};

module.exports = { enrichCoursesWithPurchase, getPurchasedCourseIdSet };
