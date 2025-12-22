const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    first_name: { type: String },
    last_name: { type: String },
    phone_number: { type: String },
    em: { type: String }, 
    address: { type: String },
    role: { type: String, default: "user" },
    pwd: { type: String },
    reset_pwd_otp: { type: String },
    reset_password_token: String,       
    reset_password_expires: Date,
    is_otp_verified: { type: Boolean }
  },
  { timestamps: true }
);

module.exports = mongoose.model("users", UserSchema);


