const OrderModel = require("../../../models/OrderModel");

// const getAllCourses = async (req, res) => {
//   try {
//     const { query = {}, projection = { pwd: 0 }, options } = { ...req.body };

//     // if (query.instrument && query.instrument.$regex) {
//     //   const regex = query.instrument;

//     //   const instruments = await InstrumentModel.find(
//     //     { instrument_title: regex },
//     //     "_id"
//     //   ).lean();

//     //   const instrumentIds = instruments.map((inst) => inst._id);

//     //   query.instrument = { $in: instrumentIds };
//     // }

//     const data = await CourseMasterModel.find(query, projection, options)
//       .populate("instrument", "instrument_title")
//       .lean();
//     const totalDataCount = await CourseMasterModel.countDocuments(query);
//     res.json({
//       error: "",
//       msg: "success",
//       success: true,
//       data,
//       totalDataCount,
//     });
//   } catch (err) {
//     console.log("error123", err);
//     res.status(500).json({
//       error: "internal server error",
//       msg: "failed",
//       success: false,
//       data: [],
//     });
//   }
// };
const GetMyOrders = async (req, res) => {
  try {
    const { query = {}, projection = { pwd: 0 }, options } = { ...req.body };
    const finalQuery = {
      userId: req.user.id,
      ...query,
    };
    // query.userId = req.user.id;
    //const userId = req.user.id;
    // Find all orders for the user, sorted by latest
    const orders = await OrderModel.find(finalQuery, projection, options).lean();;

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
