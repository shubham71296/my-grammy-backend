const express = require('express');
const router = express.Router();
const upload = require("../../middleware/upload");
const AdminInstrumentCtrl = require("./admin-ctrl/admin-instrument-api-ctrl");
const auth = require('../../middleware/auth');

router.post('/checkinstrumenttitle',auth, AdminInstrumentCtrl.CheckInstrumentTitle);
router.post('/addinstrument', auth, AdminInstrumentCtrl.AddInstrument);
// router.post('/allinstumnts', auth,  AdminInstrumentCtrl.getAllInstruments);
router.post('/allinstumnts',  AdminInstrumentCtrl.getAllInstruments);
router.get('/instumntbyid/:id', AdminInstrumentCtrl.getInstrumentById);
router.post('/updateinstrument/:id', auth, AdminInstrumentCtrl.UpdateInstrument);
router.delete("/deleteinstrument/:id", auth, AdminInstrumentCtrl.DeleteInstrument);


module.exports.router = router;