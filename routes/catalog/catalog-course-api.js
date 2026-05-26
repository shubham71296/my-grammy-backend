const express = require("express");
const router = express.Router();
const AdminCourseCtrl = require("../admin/admin-ctrl/admin-course-api-ctrl");
const auth = require("../../middleware/auth");

router.post("/guestallcourses", AdminCourseCtrl.GuestGetAllCourses);
router.get("/guestcoursebyid/:id", AdminCourseCtrl.GuestGetCourseById);

router.post("/allcourses", auth, AdminCourseCtrl.getAllCourses);
router.get("/coursebyid/:id", auth, AdminCourseCtrl.getCourseById);

module.exports.router = router;
