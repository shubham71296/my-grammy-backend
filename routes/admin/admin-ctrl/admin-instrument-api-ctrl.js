const InstrumentModel = require("../../../models/InstrumentModel");
const CourseMasterModel = require("../../../models/CourseMasterModel");
const LectureModel = require("../../../models/LectureModel");
const { deleteS3Keys } = require("../../../utils/s3Delete");
const { listDocuments } = require("../../../utils/listDocuments");
const { sendSuccess, sendError } = require("../../../utils/apiResponse");
const { parseNonNegativePrice } = require("../../../utils/parsePrice");
const { diffRemovedMedia } = require("../../../utils/normalizeMedia");
const { collectInstrumentCascadeKeys } = require("../../../utils/cascadeDeleteInstrument");
const { withTransaction } = require("../../../utils/withTransaction");

const INSTRUMENT_QUERY_FIELDS = [
  "instrument_title",
  "instrument_price",
  "instrurment_description",
  "createdAt",
  "updatedAt",
];


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

     const priceParsed = parseNonNegativePrice(instrument_price, "instrument price");
     if (!priceParsed.ok) {
       return res.status(400).json({ error: "", success: false, msg: priceParsed.msg, data: [] });
     }
     const priceNum = priceParsed.value;
 
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


const getAllInstruments = (req, res) =>
  listDocuments({
    Model: InstrumentModel,
    req,
    res,
    allowedQueryFields: INSTRUMENT_QUERY_FIELDS,
  });

const GetGuestAllInstruments = getAllInstruments;

const getInstrumentById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return sendError(res, { msg: "Instrument ID is required", status: 400, error: "Instrument ID is required", data: null });

    const data = await InstrumentModel.findById(id).lean();
    if (!data) return sendError(res, { msg: "Instrument not found", status: 404, error: "Instrument not found", data: null });

    return sendSuccess(res, { data });
  } catch (err) {
    return sendError(res, { status: 500 });
  }
};

const GuestGetInstrumentById = getInstrumentById;


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

    const removedImages = diffRemovedMedia(
      existingData.instrument_images,
      existing_images
    );

    await deleteS3Keys(removedImages.map((img) => img.key));

    const finalImages = [...existing_images, ...new_images];
    
    const updatePayload = {
      instrument_images: finalImages,
    };

    if (instrument_title !== undefined) updatePayload.instrument_title = instrument_title?.trim();
    if (instrurment_description !== undefined) updatePayload.instrurment_description = instrurment_description;
    if (instrument_price !== undefined) {
      const priceParsed = parseNonNegativePrice(instrument_price, "instrument price");
      if (!priceParsed.ok) {
        return res.status(400).json({
          error: "",
          success: false,
          msg: priceParsed.msg,
          data: [],
        });
      }
      updatePayload.instrument_price = priceParsed.value;
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

    const { courseIds, keys } = await collectInstrumentCascadeKeys(instrument);

    await withTransaction(async (session) => {
      const opts = session ? { session } : {};
      await LectureModel.deleteMany({ course: { $in: courseIds } }, opts);
      await CourseMasterModel.deleteMany({ instrument: instrumentId }, opts);
      await InstrumentModel.findByIdAndDelete(instrumentId, opts);
    });

    await deleteS3Keys(keys);

    return res.status(200).json({
      error: "",
      success: true,
      msg: "Instrument and related courses deleted successfully",
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
  GetGuestAllInstruments,
  getInstrumentById,
  GuestGetInstrumentById,
  UpdateInstrument,
  DeleteInstrument,
};
