const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const InstrumentModel = require("../../../models/InstrumentModel");
const CourseMasterModel = require("../../../models/CourseMasterModel");
const LectureModel = require("../../../models/LectureModel");
const UserModel = require("../../../models/UserModel");
const { uploadBase64File } = require("../../../utils/s3Upload");
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../../../config/aws");
const { randomUUID } = require("crypto");
const sendEmail = require("../../../utils/sendEmail");

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

    return res.status(200).json({
      error: "",
      msg: "Signin successful",
      success: true,
      data: token,
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
};

const UserSendOtpToEmail = async (req, res) => {
  try {
    const { em } = req.body;

    if (!em) {
      return res.status(400).json({
        error: "",
        success: false,
        msg: "Email is required",
        data: [],
      });
    }

    const user = await UserModel.findOne({ em });
    if (!user) {
      return res.status(400).json({
        error: "",
        success: false,
        msg: "Email not registered!",
        data: [],
      });
    }
    if (user.role === "admin") {
      return res.status(403).json({
        error: "",
        success: false,
        msg: "Admin password reset is not allowed",
        data: [],
      });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.reset_pwd_otp = otp;
    user.reset_password_expires = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    const emailResponse = await sendEmail({
      to: em,
      subject: "Your OTP for Password Reset",
      html: `<!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8" />
              <title>OTP Verification</title>
              <style>
                body {
                  font-family: 'Arial', sans-serif;
                  margin: 0;
                  padding: 0;
                  background: #f4f7fc;
                }

                .main-table {
                  width: 100%;
                  max-width: 600px;
                  background: #ffffff;
                  margin: 40px auto;
                  border-radius: 12px;
                  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                  overflow: hidden;
                }

                .header {
                  background: linear-gradient(135deg, #0038ff, #00a0ff);
                  color: white;
                  padding: 25px 0;
                  text-align: center;
                }

                .header h1 {
                  margin: 0;
                  font-size: 26px;
                  letter-spacing: 1px;
                }

                .body {
                  padding: 30px;
                  font-size: 16px;
                  color: #333333;
                  line-height: 1.6;
                }

                .body p {
                  margin: 0 0 14px;
                }

                .otp {
                  display: inline-block;
                  font-size: 30px;
                  font-weight: bold;
                  background: #f1f6ff;
                  color: #0038ff;
                  padding: 12px 25px;
                  border-radius: 8px;
                  letter-spacing: 6px;
                  margin: 20px 0;
                }

                .footer {
                  background: #f1f6ff;
                  color: #666;
                  font-size: 14px;
                  text-align: center;
                  padding: 15px 0;
                }
              </style>
            </head>

            <body>
              <table class="main-table" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="header">
                    <h1>OTP Verification</h1>
                  </td>
                </tr>

                <tr>
                  <td class="body">
                    <p>Hello, <strong>${em}</strong></p>

                    <p>
                      Use the following One-Time Password (OTP) to reset your password.  
                      This OTP is valid for <strong>10 minutes</strong>.
                    </p>

                    <p class="otp">${otp}</p>

                    <p>
                      If you did not request this, you can safely ignore this email.
                    </p>

                    <p>
                      Regards,<br />
                      <strong>Grammy Music</strong>
                    </p>
                  </td>
                </tr>

                <tr>
                  <td class="footer">
                    © ${new Date().getFullYear()} Grammy Music. All rights reserved.
                  </td>
                </tr>
              </table>
            </body>
            </html>
            `,
    });

    if (!emailResponse.success) {
      return res.status(500).json({
        error: "Email sending failed",
        success: false,
        msg: "Failed to send email",
        data: [],
      });
    }
    const params = { em };
    return res.status(200).json({
      error: "",
      success: true,
      msg: "Email sent successfully",
      data: params,
    });
  } catch (err) {
    console.log("error", err);
    res.status(500).json({
      error: "internal server error",
      msg: "failed to send email",
      success: false,
      data: [],
    });
  }
};

const UserVerifyOtp = async (req, res) => {
  try {
    const { em, reset_pwd_otp } = req.body;

    if (!em || !reset_pwd_otp) {
      return res.status(400).json({
        error: "",
        success: false,
        msg: "Email and OTP are required",
        data: [],
      });
    }

    // 2️⃣ Find user
    const user = await UserModel.findOne({ em });
    if (!user) {
      return res.status(400).json({
        error: "",
        success: false,
        msg: "Invalid email",
        data: [],
      });
    }

    // 3️⃣ Check OTP existence
    if (!user.reset_pwd_otp) {
      return res.status(400).json({
        error: "",
        success: false,
        msg: "OTP not generated",
        data: [],
      });
    }

    // 4️⃣ Check OTP expiry
    if (user.reset_password_expires < Date.now()) {
      return res.status(400).json({
        error: "",
        success: false,
        msg: "OTP expired",
        data: [],
      });
    }

    // 5️⃣ Match OTP
    if (user.reset_pwd_otp !== reset_pwd_otp) {
      return res.status(400).json({
        error: "",
        success: false,
        msg: "Invalid OTP",
        data: [],
      });
    }

    // 6️⃣ OTP is valid → clear OTP
    user.reset_pwd_otp = null;
    user.reset_password_expires = null;
    user.is_otp_verified = true; // optional flag
    await user.save();

    return res.status(200).json({
      error: "",
      success: true,
      msg: "OTP verified successfully",
      data: { em },
    });
  } catch (err) {
    console.error("Verify OTP error:", err);
    return res.status(500).json({
      error: "internal server error",
      success: false,
      msg: "Failed to verify OTP",
      data: [],
    });
  }
};

const UserChangePassword = async (req, res) => {
  try {
    const { em, pwd } = req.body;

    if (!em || !pwd) {
      return res.status(400).json({
        error: "",
        success: false,
        msg: "Email and new password are required",
        data: [],
      });
    }

    // 2️⃣ Find user
    const user = await UserModel.findOne({ em });
    if (!user) {
      return res.status(400).json({
        error: "",
        success: false,
        msg: "User not found",
        data: [],
      });
    }

    // 3️⃣ Make sure OTP is verified before changing password
    if (!user.is_otp_verified) {
      return res.status(400).json({
        error: "",
        success: false,
        msg: "Please verify OTP before changing password",
        data: [],
      });
    }

    // 4️⃣ Hash new password
    const hashedPwd = await bcrypt.hash(pwd, 10);

    // 5️⃣ Save new password
    user.pwd = hashedPwd;

    // 6️⃣ Clear OTP-related fields
    user.reset_pwd_otp = null;
    user.reset_password_expires = null;
    user.is_otp_verified = false;

    await user.save();

    return res.status(200).json({
      error: "",
      success: true,
      msg: "Password changed successfully!",
      data: [],
    });
  } catch (err) {
    console.error("Change Password Error:", err);
    return res.status(500).json({
      error: "internal server error",
      success: false,
      msg: "Failed to change password",
      data: [],
    });
  }
};

module.exports = {
  Signup,
  Signin,
  GetCurrentUser,
  UserSendOtpToEmail,
  UserVerifyOtp,
  UserChangePassword,
};
