const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const UserModel = require("./models/UserModel");
const connectDB = require('./config/db');

// mongoose.connect("mongodb://localhost:27017/musically", {});
connectDB();

async function createAdmin() {
  const password = "Shubham@123";
  const hashedPass = await bcrypt.hash(password, 10);

  await UserModel.create({
    first_name: "Shubham",
    last_name: "patidar",
    em: "shubham@gmail.com",
    pwd: hashedPass,
    role: "admin"
  });

  console.log("Admin created");
  process.exit();
}

createAdmin();
