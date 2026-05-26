const InstrumentModel = require("../../../models/InstrumentModel");
const UserModel = require("../../../models/UserModel");
const OrderModel = require("../../../models/OrderModel");
const CourseMasterModel = require("../../../models/CourseMasterModel");
const { listDocuments } = require("../../../utils/listDocuments");
const { sendSuccess, sendError } = require("../../../utils/apiResponse");

const USER_QUERY_FIELDS = [
  "first_name",
  "last_name",
  "em",
  "phone_number",
  "address",
  "role",
  "createdAt",
  "updatedAt",
];

const getAllUsers = (req, res) =>
  listDocuments({
    Model: UserModel,
    req,
    res,
    allowedQueryFields: USER_QUERY_FIELDS,
    enforceQuery: { role: { $ne: "admin" } },
    defaultProjection: { pwd: 0 },
  });

const DeleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: "",
        success: false,
        msg: "User id is required",
        data: [],
      });
    }

    const user = await UserModel.findById(id);

    if (!user) {
      return res.status(404).json({
        error: "",
        success: false,
        msg: "User not found",
        data: [],
      });
    }

    // 🔐 Prevent deleting admin
    if (user.role === "admin") {
      return res.status(403).json({
        error: "",
        success: false,
        msg: "Admin user cannot be deleted",
        data: [],
      });
    }

    await UserModel.findByIdAndDelete(id);

    return res.status(200).json({
      error: "",
      success: true,
      msg: "User deleted successfully",
      data: [],
    });
  } catch (err) {
    console.log("Error deleting user:", err);
    return res.status(500).json({
      error: "Internal server error",
      success: false,
      msg: "User delete failed",
      data: [],
    });
  }
};

const ADMIN_ORDER_QUERY_FIELDS = [
  "userId",
  "userEmail",
  "amount",
  "paymentStatus",
  "items.title",
  "items.productType",
  "createdAt",
  "updatedAt",
];

const GetAllUserOrders = (req, res) =>
  listDocuments({
    Model: OrderModel,
    req,
    res,
    allowedQueryFields: ADMIN_ORDER_QUERY_FIELDS,
    populate: { path: "userId", select: "first_name last_name em" },
  });

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return sendError(res, { status: 400, msg: "User id is required" });
    }

    const user = await UserModel.findById(id, { pwd: 0 }).lean();
    if (!user) {
      return sendError(res, { status: 404, msg: "User not found" });
    }

    return sendSuccess(res, { msg: "User fetched", data: user });
  } catch (err) {
    console.log("Error fetching user:", err);
    return sendError(res, { status: 500, msg: "Failed to fetch user" });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return sendError(res, { status: 400, msg: "Order id is required" });
    }

    const order = await OrderModel.findById(id)
      .populate({ path: "userId", select: "first_name last_name em phone_number" })
      .lean();

    if (!order) {
      return sendError(res, { status: 404, msg: "Order not found" });
    }

    return sendSuccess(res, { msg: "Order fetched", data: order });
  } catch (err) {
    console.log("Error fetching order:", err);
    return sendError(res, { status: 500, msg: "Failed to fetch order" });
  }
};

const GetDashboardSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsers, totalCourses, totalInstruments, totalOrders, revenueStats] =
      await Promise.all([
        UserModel.countDocuments({ role: "user" }),
        CourseMasterModel.countDocuments(),
        InstrumentModel.countDocuments(),
        OrderModel.countDocuments(),
        OrderModel.aggregate([
          { $match: { paymentStatus: "paid" } },
          {
            $group: {
              _id: null,
              totalPaidOrders: { $sum: 1 },
              totalRevenue: { $sum: { $ifNull: ["$amount", 0] } },
              todaysRevenue: {
                $sum: {
                  $cond: [
                    { $gte: ["$createdAt", today] },
                    { $ifNull: ["$amount", 0] },
                    0,
                  ],
                },
              },
            },
          },
        ]),
      ]);

    const stats = revenueStats[0] ?? {};

    return res.status(200).json({
      error: "",
      success: true,
      msg: "Dashboard summary fetched",
      data: {
        users: totalUsers,
        courses: totalCourses,
        instruments: totalInstruments,
        orders: totalOrders,
        paidOrders: stats.totalPaidOrders ?? 0,
        revenue: stats.totalRevenue ?? 0,
        todaysRevenue: stats.todaysRevenue ?? 0,
        razorpayCollected: stats.totalRevenue ?? 0,
      },
    });
  } catch (err) {
    console.log("Dashboard Error:", err);
    return res.status(500).json({
      error: "internal server error",
      success: false,
      msg: "Server error",
    });
  }
};


module.exports = {
  getAllUsers,
  getUserById,
  DeleteUser,
  GetAllUserOrders,
  getOrderById,
  GetDashboardSummary,
};
