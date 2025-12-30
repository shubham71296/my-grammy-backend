const express = require('express');
const router = express.Router();
const upload = require("../../middleware/upload");
const AdminInstrumentCtrl = require("./admin-ctrl/admin-instrument-api-ctrl");
const auth = require('../../middleware/auth');

router.post('/checkinstrumenttitle',auth, AdminInstrumentCtrl.CheckInstrumentTitle);
router.post('/addinstrument', auth, AdminInstrumentCtrl.AddInstrument);
// router.post('/allinstumnts', auth,  AdminInstrumentCtrl.getAllInstruments);
router.post('/allinstumnts', auth,  AdminInstrumentCtrl.getAllInstruments);
router.post('/guestallinstumnts',  AdminInstrumentCtrl.GetGuestAllInstruments);
router.get('/instumntbyid/:id', auth,  AdminInstrumentCtrl.getInstrumentById);
router.get('/guestinstumntbyid/:id',  AdminInstrumentCtrl.GuestGetInstrumentById);
router.post('/updateinstrument/:id', auth, AdminInstrumentCtrl.UpdateInstrument);
router.delete("/deleteinstrument/:id", auth, AdminInstrumentCtrl.DeleteInstrument);


module.exports.router = router;  //GuestGetInstrumentById