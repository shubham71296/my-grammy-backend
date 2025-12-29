const express = require('express');
const router = express.Router();
const upload = require("../../middleware/upload");
const AdminUserApiCtrl = require("./admin-ctrl/admin-user-api-ctrl");
const auth = require('../../middleware/auth');


router.post('/allusers', auth, AdminUserApiCtrl.getAllUsers);
router.delete("/deleteuser/:id", auth, AdminUserApiCtrl.DeleteUser);
router.post('/allusersorders', auth, AdminUserApiCtrl.GetAllUserOrders);
router.get("/getdashboardsummary", auth, AdminUserApiCtrl.GetDashboardSummary);

module.exports.router = router;