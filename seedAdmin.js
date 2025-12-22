const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const UserModel = require("./models/UserModel");
const connectDB = require('./config/db');

// mongoose.connect("mongodb://localhost:27017/musically", {});
connectDB();

async function createAdmin() {
  const password = "Grammy@1234";
  const hashedPass = await bcrypt.hash(password, 10);

  await UserModel.create({
    first_name: "Grammy",
    last_name: "Music",
    em: "grammymusicindia@gmail.com",
    pwd: hashedPass,
    role: "admin"
  });

  console.log("Admin created");
  process.exit();
}

createAdmin();
