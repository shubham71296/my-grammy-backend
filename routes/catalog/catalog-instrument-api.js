const express = require("express");
const router = express.Router();
const AdminInstrumentCtrl = require("../admin/admin-ctrl/admin-instrument-api-ctrl");
const auth = require("../../middleware/auth");

// Public catalog read
router.post("/guestallinstumnts", AdminInstrumentCtrl.GetGuestAllInstruments);
router.get("/guestinstumntbyid/:id", AdminInstrumentCtrl.GuestGetInstrumentById);

// Authenticated catalog read (any logged-in user)
router.post("/allinstumnts", auth, AdminInstrumentCtrl.getAllInstruments);
router.get("/instumntbyid/:id", auth, AdminInstrumentCtrl.getInstrumentById);

module.exports.router = router;
