const express = require('express');
const router = express.Router();
const upload = require("../../middleware/upload");
const AdminCourseCtrl = require("./admin-ctrl/admin-course-api-ctrl");
const auth = require('../../middleware/auth');


router.post('/checkcoursetitle', auth, AdminCourseCtrl.CheckCourseTitle);
router.post('/createcourse',auth, AdminCourseCtrl.CreateCourse);  
router.post('/updatecourse/:id',auth, AdminCourseCtrl.UpdateCourse);
router.delete("/deletecourse/:id",auth, AdminCourseCtrl.DeleteCourse);

router.post('/addlecture',auth, AdminCourseCtrl.AddLecture);

router.post('/updatelecture/:id',auth, AdminCourseCtrl.UpdateLecture);

// router.post('/allcourses', auth, AdminCourseCtrl.getAllCourses);
router.post('/allcourses',auth, AdminCourseCtrl.getAllCourses);
router.post('/landingallcourses', AdminCourseCtrl.LandingGetAllCourses);
router.get('/coursebyid/:id',auth, AdminCourseCtrl.getCourseById);

router.delete("/deletelecture/:id",auth, AdminCourseCtrl.DeleteLecture);


module.exports.router = router;