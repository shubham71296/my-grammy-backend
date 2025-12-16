const OrderModel = require("../models/OrderModel");

const checkUserPurchasedCourse = async (userId, courseId) => {
  const order = await OrderModel.findOne({
    userId,
    paymentStatus: "paid",
    "items.productId": courseId,
    "items.productType": "course_masters",
  });

  return !!order;
};

module.exports = checkUserPurchasedCourse;
