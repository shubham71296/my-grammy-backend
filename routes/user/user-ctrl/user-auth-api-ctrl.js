const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const InstrumentModel = require("../../../models/InstrumentModel");
const CourseMasterModel = require("../../../models/CourseMasterModel");
const LectureModel = require("../../../models/LectureModel");
const DemoInstrumentModel = require("../../../models/DemoInstrumentModel");
const UserModel = require("../../../models/UserModel");
const { uploadBase64File } = require("../../../utils/s3Upload");
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../../../config/aws");
const { randomUUID } = require("crypto");

const Signup = async (req, res) => {
  try {
    const { first_name, last_name, phone_number, em, address, pwd } = req.body;
    const alreadyUser = await UserModel.findOne({ em });
    if (alreadyUser) {
      return res.status(400).json({
        error: "",
        success: false,
        msg: "Email already registered!",
        data: [],
      });
    }
    const hashedPwd = await bcrypt.hash(pwd, 10);
    const newUser = await UserModel.create({
      first_name,
      last_name,
      phone_number,
      em,
      address,
      pwd: hashedPwd,
    });
   
    return res.status(200).json({
      error: "",
      msg: "Signup success",
      success: true,
      data: newUser,
    });
    
   } catch (err) {
     console.log("error", err);
     res.status(500).json({
       error: "internal server error",
       msg: "Signup failed",
       success: false,
       data: [],
     });
   }
};

const Signin = async (req, res) => {
  try {
    const { em, pwd } = req.body;
    const user = await UserModel.findOne({ em });
    if (!user) {
      return res.status(400).json({
        error: "",
        success: false,
        msg: "Invalid email!",
        data: [],
      });
    }
    
    const isMatch = await bcrypt.compare(pwd, user.pwd);

    if (!isMatch) {
      return res.status(400).json({
        error: "",
        success: false,
        msg: "Incorrect password!",
        data: [],
      });
    }

    const token = jwt.sign(
      { id: user._id, em: user.em, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({ error: "", msg: 'Signin successful', success: true, data: token });
    
   } catch (err) {
     console.log("error", err);
     res.status(500).json({
       error: "internal server error",
       msg: "Signup failed",
       success: false,
       data: [],
     });
   }
};

const GetCurrentUser = async (req, res) => {
  try {
    const user_id = req.user.id;
    const profile = await UserModel.findOne({ _id: user_id });
    if (!profile) {
      return res.status(404).json({
        error: "",
        success: false,
        msg: "User not found",
        data: [],
      });
    }

    return res.status(200).json({
      error: "",
      success: true,
      msg: "User fetched successfully",
      data: profile,
    });
    
   } catch (err) {
     console.log("error", err);
     res.status(500).json({
       error: "internal server error",
       msg: "failed to fetch profile",
       success: false,
       data: [],
     });
   }
}


module.exports = {
  Signup,
  Signin,
  GetCurrentUser
};

