const express = require('express');
const router = express.Router();
const AdminUserApiCtrl = require("./admin-ctrl/admin-user-api-ctrl");
const auth = require('../../middleware/auth');
const requireAdmin = require('../../middleware/requireAdmin');

router.post('/allusers', auth, requireAdmin, AdminUserApiCtrl.getAllUsers);
router.get('/user/:id', auth, requireAdmin, AdminUserApiCtrl.getUserById);
router.delete("/deleteuser/:id", auth, requireAdmin, AdminUserApiCtrl.DeleteUser);
router.post('/allusersorders', auth, requireAdmin, AdminUserApiCtrl.GetAllUserOrders);
router.get('/order/:id', auth, requireAdmin, AdminUserApiCtrl.getOrderById);
router.get("/getdashboardsummary", auth, requireAdmin, AdminUserApiCtrl.GetDashboardSummary);

module.exports.router = router;