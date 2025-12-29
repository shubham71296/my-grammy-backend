const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const InstrumentModel = require("../../../models/InstrumentModel");
const CourseMasterModel = require("../../../models/CourseMasterModel");
const LectureModel = require("../../../models/LectureModel");
const { uploadBase64File } = require("../../../utils/s3Upload");
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../../../config/aws");
const { randomUUID } = require("crypto");


const CheckInstrumentTitle = async (req, res) => {
  try {
    const { instrument_title, instrument_id } = req.body;

    const title = instrument_title.trim();

    // CASE 1: If instrument_id exists → UPDATE mode
    if (instrument_id) {
      const duplicate = await InstrumentModel.findOne({
        instrument_title: title,
        _id: { $ne: instrument_id }, // exclude current record
      }).lean();

      if (duplicate) {
        return res.status(400).json({
          error: "",
          success: false,
          msg: "Instrument title already exists",
          data: [],
        });
      }

      return res.status(200).json({
        error: "",
        success: true,
        msg: "Title available",
        data: [],
      });
    }

    // CASE 2: ADD mode → no instrument_id
    const existingInstrument = await InstrumentModel.findOne({
      instrument_title: title,
    }).lean();

    if (existingInstrument) {
      return res.status(400).json({
        error: "",
        success: false,
        msg: "Instrument title already exists",
        data: [],
      });
    }

    return res.status(200).json({
      error: "",
      success: true,
      msg: "Title available",
      data: [],
    });

  } catch (err) {
    console.log("error", err);
    return res.status(500).json({
      error: "internal server error",
      success: false,
      msg: "Instrument title check failed",
      data: [],
    });
  }
};

const AddInstrument = async (req, res) => {
  try {
     const { instrument_title, instrument_price, instrurment_description, instrument_images } = req.body;
 
     if (!instrument_title || !instrument_title.trim()) {
       return res.status(400).json({ error: "", success: false, msg: "Instrument title required", data: [] });
     }
 
     const existingInstrument = await InstrumentModel.findOne({
       instrument_title: instrument_title.trim(),
     }).lean();
 
     if (existingInstrument) {
       return res.status(400).json({ error: "", success: false, msg: "Instrument title already exists", data: [] });
     }

     const priceNum = Number(instrument_price);
     if (Number.isNaN(priceNum) || priceNum < 0) return res.status(400).json({ error: "", success:false, msg:'Invalid price', data: [] });
 
     const newInstrument = await InstrumentModel.create({
       instrument_title,
       instrument_price: priceNum,
       instrurment_description,
       instrument_images,
     });
 
     return res.status(200).json({
       error: "",
       msg: "Instrument added success",
       success: true,
       data: newInstrument,
     });
   } catch (err) {
     console.log("error", err);
    return res.status(500).json({
       error: "internal server error",
       msg: "Instrument added failed",
       success: false,
       data: [],
     });
   }
};


const getAllInstruments = async (req, res) => {
  try {
    const { query = {}, projection = { pwd: 0 }, options } = { ...req.body };
    const data = await InstrumentModel.find(query, projection, options).lean();
    const totalDataCount = await InstrumentModel.countDocuments(query);
    res.json({
      error: "",
      msg: "success",
      success: true,
      data,
      totalDataCount,
    });
  } catch (err) {
    res.status(500).json({
      error: "internal server error",
      msg: "failed",
      success: false,
      data: [],
    });
  }
};

const GetLandingAllInstruments = async (req, res) => {
  try {
    const { query = {}, projection = { pwd: 0 }, options } = { ...req.body };
    const data = await InstrumentModel.find(query, projection, options).lean();
    const totalDataCount = await InstrumentModel.countDocuments(query);
    res.json({
      error: "",
      msg: "success",
      success: true,
      data,
      totalDataCount,
    });
  } catch (err) {
    res.status(500).json({
      error: "internal server error",
      msg: "failed",
      success: false,
      data: [],
    });
  }
};


const getInstrumentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: "Instrument ID is required",
        msg: "failed",
        success: false,
        data: null,
      });
    }

    const data = await InstrumentModel.findById(id).lean();

    if (!data) {
      return res.status(404).json({
        error: "Instrument not found",
        msg: "failed",
        success: false,
        data: null,
      });
    }
    res.status(200).json({ error: "", msg: "success", success: true, data });
  } catch (err) {
    res.status(500).json({
      error: "internal server error",
      msg: "failed",
      success: false,
      data: [],
    });
  }
};


const UpdateInstrument = async (req, res) => {
  try {
    const instrumentId = req.params.id;
    const {
      instrument_title,
      instrument_price,
      instrurment_description,
      existing_images = [],
      new_images = [],
    } = req.body;

    if (instrument_title) {
      const duplicate = await InstrumentModel.findOne({
        instrument_title: instrument_title.trim(),
        _id: { $ne: instrumentId }, // <-- exclude current record
      }).lean();

      if (duplicate) {
        return res.status(400).json({
          error: "",
          success: false,
          msg: "Instrument title already exists",
          data: [],
        });
      }
    }

   const existingData = await InstrumentModel.findById(instrumentId);
    if (!existingData) {
      return res.status(404).json({
        error: "",
        msg: "Instrument not found",
        success: false,
        data: [],
      });
    }

    const oldImagesFlat = existingData.instrument_images
      .map((img) => {
        const fileObj = Array.isArray(img) ? img[0] : img;

        if (!fileObj || !fileObj.key) return null;

        return {
          key: fileObj.key,
          url: fileObj.url,
          originalName: fileObj.originalName || fileObj.key.split("/").pop(),
          mimeType: fileObj.mimeType || "image/jpeg",
          size: fileObj.size || 0,
        };
      })
      .filter(Boolean);

    const removedImages = oldImagesFlat.filter(
      (img) => !existing_images.some((e) => e.key === img.key)
    );

    for (const img of removedImages) {
      if (!img.key) continue;

      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: img.key,
        })
      );
    }

    const finalImages = [...existing_images, ...new_images];
    
    const updatePayload = {
      instrument_images: finalImages,
    };

    if (instrument_title !== undefined) updatePayload.instrument_title = instrument_title?.trim();
    if (instrurment_description !== undefined) updatePayload.instrurment_description = instrurment_description;
    if (instrument_price !== undefined) {
      const priceNum = Number(instrument_price);
      if (Number.isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({
          error: "",
          success: false,
          msg: "Invalid instrument price",
          data: [],
        });
      }
      updatePayload.instrument_price = priceNum;
    }
    const updatedInstrument = await InstrumentModel.findByIdAndUpdate(instrumentId, updatePayload, { new: true });

    return res.status(200).json({
      error: "",
      msg: "Instrument updated success",
      success: true,
      data: updatedInstrument,
    });

  } catch (err) {
    console.error("UpdateInstrument error:", err);
    return res.status(500).json({
      error: "internal server error",
      msg: "Instrument update failed",
      success: false,
      data: [],
    });
  }
};


const DeleteInstrument = async (req, res) => {
  try {
    const instrumentId = req.params.id;

    const instrument = await InstrumentModel.findById(instrumentId).lean();

    if (!instrument) {
      return res.status(404).json({
        error: "Instrument not found",
        success: false,
        msg: "Instrument not found",
        data: [],
      });
    }

    const images = Array.isArray(instrument.instrument_images)
      ? instrument.instrument_images
      : [];

    const flatImages = images
      .map((img) => {
        const fileObj = Array.isArray(img) ? img[0] : img;
        if (!fileObj || !fileObj.key) return null;

        return {
          key: fileObj.key,
        };
      })
      .filter(Boolean); 

    for (const img of flatImages) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: img.key,
          })
        );
        console.log("Deleted from S3:", img.key);
      } catch (s3Error) {
        console.log("⚠ S3 Delete Failed For:", img.key, s3Error);
      }
    }

    await InstrumentModel.findByIdAndDelete(instrumentId);

    return res.status(200).json({
      error: "",
      success: true,
      msg: "Instrument deleted successfully",
      data: [],
    });
    
  } catch (err) {
    console.log("Error deleting instrument:", err);
    return res.status(500).json({
      error: "Internal server error",
      success: false,
      msg: "Instrument delete failed",
      data: [],
    });
  }
};


module.exports = {
  CheckInstrumentTitle,
  AddInstrument,
  getAllInstruments,
  GetLandingAllInstruments,
  getInstrumentById,
  UpdateInstrument,
  DeleteInstrument,
};
