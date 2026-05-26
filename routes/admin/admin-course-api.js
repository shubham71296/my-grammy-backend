const express = require('express');
const router = express.Router();
const AdminCourseCtrl = require("./admin-ctrl/admin-course-api-ctrl");
const auth = require('../../middleware/auth');
const requireAdmin = require('../../middleware/requireAdmin');

router.post('/checkcoursetitle', auth, requireAdmin, AdminCourseCtrl.CheckCourseTitle);
router.post('/createcourse', auth, requireAdmin, AdminCourseCtrl.CreateCourse);
// Legacy read aliases (prefer /api/catalog/*)
router.post('/guestallcourses', AdminCourseCtrl.GuestGetAllCourses);
router.post('/allcourses', auth, AdminCourseCtrl.getAllCourses);
router.get('/guestcoursebyid/:id', AdminCourseCtrl.GuestGetCourseById);
router.get('/coursebyid/:id', auth, AdminCourseCtrl.getCourseById);
router.post('/updatecourse/:id', auth, requireAdmin, AdminCourseCtrl.UpdateCourse);
router.delete("/deletecourse/:id", auth, requireAdmin, AdminCourseCtrl.DeleteCourse);

router.post('/addlecture', auth, requireAdmin, AdminCourseCtrl.AddLecture);

router.post('/updatelecture/:id', auth, requireAdmin, AdminCourseCtrl.UpdateLecture);

router.delete("/deletelecture/:id", auth, requireAdmin, AdminCourseCtrl.DeleteLecture);


module.exports.router = router;