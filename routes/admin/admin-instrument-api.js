const express = require('express');
const router = express.Router();
const AdminInstrumentCtrl = require("./admin-ctrl/admin-instrument-api-ctrl");
const auth = require('../../middleware/auth');
const requireAdmin = require('../../middleware/requireAdmin');

router.post('/checkinstrumenttitle', auth, requireAdmin, AdminInstrumentCtrl.CheckInstrumentTitle);
router.post('/addinstrument', auth, requireAdmin, AdminInstrumentCtrl.AddInstrument);
// Legacy read aliases (prefer /api/catalog/*)
router.post('/guestallinstumnts', AdminInstrumentCtrl.GetGuestAllInstruments);
router.post('/allinstumnts', auth, AdminInstrumentCtrl.getAllInstruments);
router.get('/guestinstumntbyid/:id', AdminInstrumentCtrl.GuestGetInstrumentById);
router.get('/instumntbyid/:id', auth, AdminInstrumentCtrl.getInstrumentById);
router.post('/updateinstrument/:id', auth, requireAdmin, AdminInstrumentCtrl.UpdateInstrument);
router.delete("/deleteinstrument/:id", auth, requireAdmin, AdminInstrumentCtrl.DeleteInstrument);


module.exports.router = router;  //GuestGetInstrumentById