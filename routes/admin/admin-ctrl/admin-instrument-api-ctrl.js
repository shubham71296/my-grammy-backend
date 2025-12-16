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
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);


// const CheckInstrumentTitle = async (req, res) => {
//   try {
//      const { instrument_title } = req.body;
 
//      const existingInstrument = await InstrumentModel.findOne({
//        instrument_title: instrument_title.trim(),
//      }).lean();
 
//      if (existingInstrument) {
//        return res.status(400).json({ error: "", success: false, msg: "Instrument title already exists", data: [] });
//      }

//      return res.status(200).json({
//        error: "",
//        msg: "Title available",
//        success: true,
//        data: [],
//      });

//    } catch (err) {
//      console.log("error", err);
//     return res.status(500).json({
//        error: "internal server error",
//        msg: "Instrument added failed",
//        success: false,
//        data: [],
//      });
//    }
// };

// const CheckUpdateInstrumentTitle = async (req, res) => {
//   try {
//      const { instrument_title, instrument_id } = req.body;
     
//      const duplicate = await InstrumentModel.findOne({
//         instrument_title: instrument_title.trim(),
//         _id: { $ne: instrument_id }, // <-- exclude current record
//       }).lean();

//       if (duplicate) {
//         return res.status(400).json({
//           error: "",
//           success: false,
//           msg: "Instrument title already exists",
//           data: [],
//         });
//       }

//      return res.status(200).json({
//        error: "",
//        msg: "Title available",
//        success: true,
//        data: [],
//      });

//    } catch (err) {
//      console.log("error", err);
//     return res.status(500).json({
//        error: "internal server error",
//        msg: "Instrument added failed",
//        success: false,
//        data: [],
//      });
//    }
// };

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
     let product = null;
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

     product = await stripe.products.create({
      name: instrument_title,
      description: instrurment_description || '',
      images: instrument_images.filter(Boolean).map(i => i.url).slice(0, 8)
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(priceNum * 100),
      currency: "inr"
    });
 
     const newInstrument = await InstrumentModel.create({
       instrument_title,
       instrument_price: priceNum,
       instrurment_description,
       instrument_images,
       stripeProductId: product.id,
       stripePriceId: price.id,
     });
 
     return res.status(200).json({
       error: "",
       msg: "Instrument added success",
       success: true,
       data: newInstrument,
     });
   } catch (err) {
     console.log("error", err);
     if (product?.id) {
      try { await stripe.products.del(product.id); } catch(e){ console.error('stripe cleanup', e); }
     }
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
// const UpdateInstrument = async (req, res) => {
//   try {
//     const instrumentId = req.params.id;
//     const {
//       instrument_title,
//       instrument_price,
//       instrurment_description,
//       existing_images = [],
//       new_images = [],
//     } = req.body;

//     if (instrument_title) {
//       const duplicate = await InstrumentModel.findOne({
//         instrument_title: instrument_title.trim(),
//         _id: { $ne: instrumentId }, // <-- exclude current record
//       }).lean();

//       if (duplicate) {
//         return res.status(400).json({
//           error: "",
//           success: false,
//           msg: "Instrument title already exists",
//           data: [],
//         });
//       }
//     }

//    const existingData = await InstrumentModel.findById(instrumentId);
//     if (!existingData) {
//       return res.status(404).json({
//         error: "",
//         msg: "Instrument not found",
//         success: false,
//         data: [],
//       });
//     }

//     const oldImagesFlat = existingData.instrument_images
//       .map((img) => {
//         const fileObj = Array.isArray(img) ? img[0] : img;

//         if (!fileObj || !fileObj.key) return null;

//         return {
//           key: fileObj.key,
//           url: fileObj.url,
//           originalName: fileObj.originalName || fileObj.key.split("/").pop(),
//           mimeType: fileObj.mimeType || "image/jpeg",
//           size: fileObj.size || 0,
//         };
//       })
//       .filter(Boolean);

//     const removedImages = oldImagesFlat.filter(
//       (img) => !existing_images.some((e) => e.key === img.key)
//     );

//     for (const img of removedImages) {
//       if (!img.key) continue;

//       await s3.send(
//         new DeleteObjectCommand({
//           Bucket: process.env.AWS_BUCKET_NAME,
//           Key: img.key,
//         })
//       );
//     }

//     const finalImages = [...existing_images, ...new_images];

//     const updatedInstrument = await InstrumentModel.findByIdAndUpdate(
//       instrumentId,
//       {
//         instrument_title,
//         instrument_price,
//         instrurment_description,
//         instrument_images: finalImages,
//       },
//       { new: true }
//     );

//     res.status(200).json({
//       error: "",
//       msg: "Instrument updated success",
//       success: true,
//       data: updatedInstrument,
//     });
  
//   } catch (err) {
//     console.log("error", err);
//     res.status(500).json({
//       error: "internal server error",
//       msg: "Instrument update failed",
//       success: false,
//       data: [],
//     });
//   }
// };

const UpdateInstrument = async (req, res) => {
  try {
    let createdStripeProductId = null;
    let createdStripePriceId = null;
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

    let stripePriceIdToSave = existingData.stripePriceId || null;
    let stripeProductIdToSave = existingData.stripeProductId || null;

    const priceChanged =
      instrument_price !== undefined &&
      instrument_price !== null &&
      Number(instrument_price) !== Number(existingData.instrument_price);

    if (process.env.STRIPE_SECRET_KEY && priceChanged) {
      const priceNum = Number(instrument_price);
      if (Number.isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({ error: "", success: false, msg: "Invalid instrument_price", data: [] });
      }
      if (existingData.stripeProductId) {
        try {
          const newPrice = await stripe.prices.create({
            product: existingData.stripeProductId,
            unit_amount: Math.round(priceNum * 100),
            currency: "inr"
          });
          stripePriceIdToSave = newPrice.id;
          createdStripePriceId = newPrice.id; // track for debugging
        } catch (err) {
          console.error("Failed to create Stripe price for existing product:", err);
          return res.status(500).json({ error: "", success: false, msg: "Failed to update Stripe price", data: [] });
        }
      } else {
        try {
          const productPayload = {
            name: (instrument_title || existingData.instrument_title || "Instrument").trim(),
            description: instrurment_description || existingData.instrurment_description || "",
          };

          // pass images to stripe product if available (max 8 images)
          if (Array.isArray(finalImages) && finalImages.length) {
            productPayload.images = finalImages.map((i) => i.url).filter(Boolean).slice(0, 8);
          }
          const createdProduct = await stripe.products.create(productPayload);
          createdStripeProductId = createdProduct.id;
          stripeProductIdToSave = createdProduct.id;

          const newPrice = await stripe.prices.create({
            product: createdProduct.id,
            unit_amount: Math.round(priceNum * 100),
            currency: "inr"
          });
          stripePriceIdToSave = newPrice.id;
          createdStripePriceId = newPrice.id;
        } catch (err) {
          console.error("Failed to create Stripe product+price:", err);
          // If product was created but price creation failed, try to clean up product
          if (createdStripeProductId) {
            try {
              await stripe.products.del(createdStripeProductId);
            } catch (cleanupErr) {
              console.error("Failed to cleanup created Stripe product after price failure:", cleanupErr);
            }
          }
          return res.status(500).json({ error: "", success: false, msg: "Failed to create Stripe product/price", data: [] });
        }

      } 
    }

    const updatePayload = {};
    if (instrument_title !== undefined) updatePayload.instrument_title = instrument_title?.trim();
    if (instrument_price !== undefined) updatePayload.instrument_price = Number(instrument_price);
    if (instrurment_description !== undefined) updatePayload.instrurment_description = instrurment_description;
    updatePayload.instrument_images = finalImages;
    if (stripeProductIdToSave) updatePayload.stripeProductId = stripeProductIdToSave;
    if (stripePriceIdToSave) updatePayload.stripePriceId = stripePriceIdToSave;
    
    let updatedInstrument;
    try {
      updatedInstrument = await InstrumentModel.findByIdAndUpdate(instrumentId, updatePayload, { new: true });
    } catch (dbErr) {
      console.error("DB update failed:", dbErr);
      if (createdStripeProductId) {
        try {
          await stripe.products.del(createdStripeProductId);
        } catch (cleanupErr) {
          console.error("Failed to cleanup stripe product after DB failure:", cleanupErr);
        }
      }
      return res.status(500).json({
        error: "internal server error",
        msg: "Instrument update failed",
        success: false,
        data: [],
      });
    }

    return res.status(200).json({
      error: "",
      msg: "Instrument updated success",
      success: true,
      data: updatedInstrument,
    });

  } catch (err) {
    console.error("UpdateInstrument error:", err);

    // best-effort cleanup: if we created a stripe product earlier but hit an unexpected error, try to delete it
    try {
      if (createdStripeProductId) {
        await stripe.products.del(createdStripeProductId);
      }
    } catch (cleanupErr) {
      console.error("Error cleaning up stripe product in catch:", cleanupErr);
    }

    return res.status(500).json({
      error: "internal server error",
      msg: "Instrument update failed",
      success: false,
      data: [],
    });
  }
};

// const DeleteInstrument = async (req, res) => {
//   try {
//     const instrumentId = req.params.id;

//     const instrument = await InstrumentModel.findById(instrumentId).lean();

//     console.log("instrument",instrument)

//     if (!instrument) {
//       return res.status(404).json({
//         error: "Instrument not found",
//         success: false,
//         msg: "Instrument not found",
//         data: [],
//       });
//     }

//     const images = Array.isArray(instrument.instrument_images)
//       ? instrument.instrument_images
//       : [];

//     const flatImages = images
//       .map((img) => {
//         const fileObj = Array.isArray(img) ? img[0] : img;
//         if (!fileObj || !fileObj.key) return null;

//         return {
//           key: fileObj.key,
//         };
//       })
//       .filter(Boolean); 

//     for (const img of flatImages) {
//       try {
//         await s3.send(
//           new DeleteObjectCommand({
//             Bucket: process.env.AWS_BUCKET_NAME,
//             Key: img.key,
//           })
//         );
//         console.log("Deleted from S3:", img.key);
//       } catch (s3Error) {
//         console.log("⚠ S3 Delete Failed For:", img.key, s3Error);
//       }
//     }

//    await InstrumentModel.findByIdAndDelete(instrumentId);

//     return res.status(200).json({
//       error: "",
//       success: true,
//       msg: "Instrument deleted successfully",
//       data: [],
//     });

//   } catch (err) {
//     console.log("Error deleting instrument:", err);
//     return res.status(500).json({
//       error: "Internal server error",
//       success: false,
//       msg: "Instrument delete failed",
//       data: [],
//     });
//   }
// };
const DeleteInstrument = async (req, res) => {
  try {
    const warnings = [];
    const instrumentId = req.params.id;

    const instrument = await InstrumentModel.findById(instrumentId).lean();

    console.log("instrument",instrument)

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
    
    const stripeProductId = instrument.stripeProductId || instrument.stripe_product_id || null;
    if (stripe && stripeProductId) {
      try {
        // Use Stripe auto pagination to list all prices for the product
        const prices = [];
        const listParams = { product: stripeProductId, limit: 100 };
        try {
          for await (const p of stripe.prices.list(listParams).autoPagingIterator()) {
            prices.push(p);
          }
        } catch (iterErr) {
          console.warn("⚠ Failed to iterate stripe prices:", iterErr && iterErr.message ? iterErr.message : iterErr);
          warnings.push(`Failed to list Stripe prices for ${stripeProductId}`);
        }

        // Deactivate each active price (best-effort)
        for (const p of prices) {
          if (p && p.active) {
            try {
              await stripe.prices.update(p.id, { active: false });
              console.log("Deactivated Stripe price:", p.id);
            } catch (priceErr) {
              console.warn("⚠ Failed to deactivate price", p.id, priceErr && priceErr.message ? priceErr.message : priceErr);
              warnings.push(`Failed to deactivate Stripe price ${p.id}`);
            }
          }
        }

        // Try to delete the product now that prices were deactivated
        try {
          await stripe.products.del(stripeProductId);
          console.log("Deleted Stripe product:", stripeProductId);
        } catch (delErr) {
          // If deletion fails (e.g., Stripe still refuses), fallback to marking product inactive
          console.warn("⚠ Stripe product delete failed:", stripeProductId, delErr && delErr.message ? delErr.message : delErr);
          warnings.push(`Stripe product deletion failed for ${stripeProductId}: ${delErr.message || delErr}`);

          try {
            // set product.active = false (soft-archive)
            await stripe.products.update(stripeProductId, { active: false });
            console.log("Marked Stripe product inactive:", stripeProductId);
            warnings.push(`Stripe product ${stripeProductId} set to inactive.`);
          } catch (updateErr) {
            console.error("⚠ Failed to set Stripe product inactive:", stripeProductId, updateErr && updateErr.message ? updateErr.message : updateErr);
            warnings.push(`Failed to deactivate Stripe product ${stripeProductId}: ${updateErr.message || updateErr}`);
          }
        }
      } catch (stripeErr) {
        console.error("⚠ Stripe cleanup error:", stripeErr && stripeErr.message ? stripeErr.message : stripeErr);
        warnings.push(`Stripe cleanup failed for product ${stripeProductId}: ${stripeErr.message || stripeErr}`);
      }
    }

    // 3) Delete DB record
    try {
      await InstrumentModel.findByIdAndDelete(instrumentId);
    } catch (dbDelErr) {
      console.error("⚠ Failed to delete instrument from DB:", dbDelErr);
      return res.status(500).json({
        error: "Failed to delete instrument from DB",
        success: false,
        msg: "Instrument deletion failed",
        data: [],
        warnings,
      });
    }

    // 4) Respond with warnings if any
    const payload = {
      error: "",
      success: true,
      msg: "Instrument deleted successfully",
      data: [],
    };
    if (warnings.length) payload.warnings = warnings;

    return res.status(200).json(payload);
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

// const CreateCourse = async (req, res) => {
//   try {
//     const { instrument, course_title, course_description, course_price, thumbnail_image } = req.body;
//     const existingCourseTitle = await CourseMasterModel.findOne({
//       course_title: course_title.trim(),
//     }).lean();

//     if (existingCourseTitle) {
//       return res.status(400).json({ error: "", success: false, msg: "Course title already exists", data: [] });
//     }
    
//     const createCourse = await CourseMasterModel.create({
//       instrument,
//       course_title,
//       course_price,
//       course_description,
//       thumbnail_image
//     });

//     res.status(200).json({
//       error: "",
//       success: true,
//       msg: "Course created successfully please add videos",
//       data: createCourse,
//     });
//   } catch (err) {
//     console.error("AddCourseMaster error:", err);
//     res.status(500).json({
//       error: "internal server error",
//       success: false,
//       msg: "Failed to create course master",
//       data: [],
//     });
//   }
// };


module.exports = {
  CheckInstrumentTitle,
  AddInstrument,
  getAllInstruments,
  getInstrumentById,
  UpdateInstrument,
  DeleteInstrument,
};
