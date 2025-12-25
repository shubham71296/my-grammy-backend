const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const InstrumentModel = require("../../../models/InstrumentModel");
const UserModel = require("../../../models/UserModel");
const OrderModel = require("../../../models/OrderModel");
const CourseMasterModel = require("../../../models/CourseMasterModel");
const LectureModel = require("../../../models/LectureModel");
const { uploadBase64File } = require("../../../utils/s3Upload");
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../../../config/aws");
const { randomUUID } = require("crypto");

const getAllUsers = async (req, res) => {
  try {
    const { query = {}, projection = { pwd: 0 }, options } = { ...req.body };
    const finalQuery = {
      ...query,
      role: { $ne: "admin" }, 
    };
    const data = await UserModel.find(finalQuery, projection, options).lean();
    const totalDataCount = await UserModel.countDocuments(finalQuery);
    res.json({
      error: "",
      msg: "success",
      success: true,
      data,
      totalDataCount,
    });
  } catch (err) {
    res.status(500).json({
      error: "internal server error",
      msg: "failed",
      success: false,
      data: [],
    });
  }
};

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

const GetAllUserOrders = async (req, res) => {
  try {
    const { query = {}, projection = {}, options = {} } = { ...req.body };

    const finalQuery = {
      ...query, // admin can filter anything
    };

    const orders = await OrderModel.find(
      finalQuery,
      projection,
      options
    )
    .populate("userId", "first_name last_name") // optional but recommended
    .lean();

    const totalDataCount = await OrderModel.countDocuments(finalQuery);

    return res.status(200).json({
      error: "",
      msg: "orders fetched",
      success: true,
      data: orders,
      totalDataCount,
    });
  } catch (err) {
    console.error("GetAllOrders error:", err);
    return res.status(500).json({
      error: "internal server error",
      success: false,
      msg: "Failed to fetch orders",
      data: [],
    });
  }
};


module.exports = {
  getAllUsers,
  DeleteUser,
  GetAllUserOrders
};
