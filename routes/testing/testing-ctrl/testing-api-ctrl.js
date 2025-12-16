const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const InstrumentModel = require("../../../models/InstrumentModel");
const CourseMasterModel = require("../../../models/CourseMasterModel");
const LectureModel = require("../../../models/LectureModel");
const DemoInstrumentModel = require("../../../models/DemoInstrumentModel");
const { uploadBase64File } = require("../../../utils/s3Upload");
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../../../config/aws");
const { randomUUID } = require("crypto");



// const DummyTestingApi = async (req, res) => {
//    try {
//     console.log("req.body",req.body)
//     console.log("req.files",req.files)
//       const { instrument_title, instrument_price, instrurment_description } =
//         req.body;
//       const existingInstrument = await DemoInstrumentModel.findOne({
//         instrument_title: instrument_title.trim(),
//       }).lean();
//       if (existingInstrument) {
//         return res.status(400).json({
//           error: "",
//           success: false,
//           msg: "Instrument title already exists",
//           data: [],
//         });
//       }
//       const images = [];
//       for (const file of req.files.instrument_images || []) {
//         const ext =
//           (file.originalname && file.originalname.split(".").pop()) || "";
//         const key = `instruments/${Date.now()}-${randomUUID()}${
//           ext ? "." + ext : ""
//         }`;
  
//         const cmd = new PutObjectCommand({
//           Bucket: process.env.AWS_BUCKET_NAME,
//           Key: key,
//           Body: file.buffer,
//           ContentType: file.mimetype,
//         });
//         await s3.send(cmd);
  
//         const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  
//         images.push({
//           key,
//           url,
//           originalName: file.originalname,
//           mimeType: file.mimetype,
//           size: file.size,
//         });
//       }
  
//       const newInstrument = await DemoInstrumentModel.create({
//         instrument_title,
//         instrument_price,
//         instrurment_description,
//         instrument_images: images,
//       });
//       res.status(200).json({
//         error: "",
//         msg: "Instrument added success",
//         success: true,
//         data: newInstrument,
//       });
//     } catch (err) {
//       console.log("error", err);
//       res.status(500).json({
//         error: "internal server error",
//         msg: "Instrument added failed",
//         success: false,
//         data: [],
//       });
//     }
// };

const DummyTestingApi = async (req, res) => {
  try {
    const { instrument_title, instrument_price, instrurment_description, instrument_images } = req.body;

    if (!instrument_title || !instrument_title.trim()) {
      return res.status(400).json({ error: "", success: false, msg: "Instrument title required", data: [] });
    }

    const existingInstrument = await DemoInstrumentModel.findOne({
      instrument_title: instrument_title.trim(),
    }).lean();

    if (existingInstrument) {
      return res.status(400).json({ error: "", success: false, msg: "Instrument title already exists", data: [] });
    }

    // Use metadata array from frontend (after presigned upload)
    let images = [];
    if (instrument_images) {
      try {
        const parsed = typeof instrument_images === "string" ? JSON.parse(instrument_images) : instrument_images;
        if (Array.isArray(parsed)) {
          images = parsed.map((img) => ({
            key: img.key,
            url: img.url,
            originalName: img.originalName || img.name || "",
            mimeType: img.mimeType || "",
            size: img.size || 0,
          }));
        }
      } catch (err) {
        images = [];
      }
    }

    const newInstrument = await DemoInstrumentModel.create({
      instrument_title,
      instrument_price,
      instrurment_description,
      instrument_images: images,
    });

    return res.status(200).json({
      error: "",
      msg: "Instrument added success",
      success: true,
      data: newInstrument,
    });
  } catch (err) {
    console.log("error", err);
    res.status(500).json({
      error: "internal server error",
      msg: "Instrument added failed",
      success: false,
      data: [],
    });
  }
};




module.exports = {
  DummyTestingApi,
};
