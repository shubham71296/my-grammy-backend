const OrderModel = require("../../../models/OrderModel");

const GetMyOrders = async (req, res) => {
  try {
    const { query = {}, projection = { pwd: 0 }, options } = { ...req.body };
    const finalQuery = {
      userId: req.user.id,
      ...query,
    };

    const orders = await OrderModel.find(
      finalQuery,
      projection,
      options
    ).lean();

    return res.status(200).json({
      error: "",
      msg: "order fetched",
      success: true,
      data: orders,
    });
  } catch (err) {
    console.error("GetMyOrders error:", err);
    return res.status(500).json({
      error: "internal server error",
      success: false,
      msg: "Failed to fetch orders",
      data: [],
    });
  }
};

module.exports = {
  GetMyOrders,
};
