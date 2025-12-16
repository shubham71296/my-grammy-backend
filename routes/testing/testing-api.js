const express = require('express');
const router = express.Router();
const upload = require("../../middleware/upload");
const TestingCtrl = require("./testing-ctrl/testing-api-ctrl");

// router.post('/dummyapi',upload.fields([
//     { name: "instrument_images", maxCount: 20 } // allow many images
//   ]), TestingCtrl.DummyTestingApi);
router.post('/dummyapi', TestingCtrl.DummyTestingApi);

module.exports.router = router;