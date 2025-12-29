const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const InstrumentModel = require("../../../models/InstrumentModel");
const CourseMasterModel = require("../../../models/CourseMasterModel");
const LectureModel = require("../../../models/LectureModel");
const OrderModel = require("../../../models/OrderModel");
const { uploadBase64File } = require("../../../utils/s3Upload");
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../../../config/aws");
const { randomUUID } = require("crypto");


const CheckCourseTitle = async (req, res) => {
  try {
     const { course_title, course_id } = req.body;
     const title = course_title.trim();

     if (course_id) {
      const duplicate = await CourseMasterModel.findOne({
        course_title: title,
        _id: { $ne: course_id }, // exclude current course
      }).lean();

      if (duplicate) {
        return res.status(400).json({
          error: "",
          success: false,
          msg: "Course title already exists",
          data: [],
        });
      }

      return res.status(200).json({
        error: "",
        success: true,
        msg: "Course title available",
        data: [],
      });
    }

 
     const existingCourseTitle = await CourseMasterModel.findOne({
      course_title: course_title.trim(),
    }).lean();
 
     if (existingCourseTitle) {
       return res.status(400).json({ error: "", success: false, msg: "Course title already exists", data: [] });
     }

     return res.status(200).json({
       error: "",
       msg: "Course available",
       success: true,
       data: [],
     });

   } catch (err) {
     console.log("error", err);
    return res.status(500).json({
       error: "internal server error",
       msg: "Course added failed",
       success: false,
       data: [],
     });
   }
};

const CreateCourse = async (req, res) => {
  try {
    const { instrument, course_title, course_description, course_price, thumbnail_image } = req.body;
    const existingCourseTitle = await CourseMasterModel.findOne({
      course_title: course_title.trim(),
    }).lean();

    if (existingCourseTitle) {
      return res.status(400).json({ error: "", success: false, msg: "Course title already exists", data: [] });
    }
    
    const priceNum = Number(course_price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ error: "", success: false, msg: "Invalid course price", data: [] });
    }
 
    const createCourse = await CourseMasterModel.create({
      instrument,
      course_title,
      course_price: priceNum,
      course_description,
      thumbnail_image
    });

    res.status(200).json({
      error: "",
      success: true,
      msg: "Course created successfully please add videos",
      data: createCourse,
    });
  } catch (err) {
    console.error("AddCourseMaster error:", err);
    res.status(500).json({
      error: "internal server error",
      success: false,
      msg: "Failed to create course master",
      data: [],
    });
  }
};

const getAllCourses = async (req, res) => {
  try {
    const { query = {}, projection = { pwd: 0 }, options } = { ...req.body };

    // if (query.instrument && query.instrument.$regex) {
    //   const regex = query.instrument;

    //   const instruments = await InstrumentModel.find(
    //     { instrument_title: regex },
    //     "_id"
    //   ).lean();

    //   const instrumentIds = instruments.map((inst) => inst._id);

    //   query.instrument = { $in: instrumentIds };
    // }

    const courses = await CourseMasterModel.find(query, projection, options)
      .populate("instrument", "instrument_title")
      .lean();

    const totalDataCount = await CourseMasterModel.countDocuments(query);

    if (req.user?.role === "admin") {
      return res.json({
        error:"",
        success: true,
        msg: "success",
        data: courses.map(c => ({
          ...c,
          isPurchased: true, // admin has full access
        })),
        totalDataCount,
      });
    }

    if (!req.user?.id) {
      return res.json({
        error:"",
        success: true,
        msg: "success",
        data: courses.map(c => ({
          ...c,
          isPurchased: false,
        })),
        totalDataCount,
      });
    }

    const purchasedCourseIds = await OrderModel.distinct(
      "items.productId",
      {
        userId: req.user.id,
        paymentStatus: "paid",
        "items.productType": "course_masters",
      }
    );

    const purchasedSet = new Set(
      purchasedCourseIds.map(id => id.toString())
    );

    const finalData = courses.map(course => ({
      ...course,
      isPurchased: purchasedSet.has(course._id.toString()),
    }));


    res.json({
      error: "",
      msg: "success",
      success: true,
      data: finalData,
      totalDataCount
    });
  } catch (err) {
    console.log("error123", err);
    res.status(500).json({
      error: "internal server error",
      msg: "failed",
      success: false,
      data: [],
    });
  }
};

const LandingGetAllCourses = async (req, res) => {
  try {
    const { query = {}, projection = { pwd: 0 }, options } = { ...req.body };

    const courses = await CourseMasterModel.find(query, projection, options)
      .populate("instrument", "instrument_title")
      .lean();

    const totalDataCount = await CourseMasterModel.countDocuments(query);


    res.json({
      error: "",
      msg: "success",
      success: true,
      data: courses,
      totalDataCount
    });
  } catch (err) {
    console.log("error123", err);
    res.status(500).json({
      error: "internal server error",
      msg: "failed",
      success: false,
      data: [],
    });
  }
};

// const getCourseById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!id) {
//       return res.status(400).json({
//         error: "Course ID is required",
//         msg: "failed",
//         success: false,
//         data: null,
//       });
//     }

//     const course_data = await CourseMasterModel.findById(id)
//       .populate({ path: "instrument", select: "instrument_title" })
//       .lean();
//     if (!course_data) {
//       return res.status(404).json({
//         error: "Course not found",
//         msg: "failed",
//         success: false,
//         data: null,
//       });
//     }

//     const lectures_data = await LectureModel.find({ course: id }).lean();
//     const data = {
//       course_data,
//       lectures_data,
//     };

//     res.status(200).json({ error: "", msg: "success", success: true, data });
//   } catch (err) {
//     res.status(500).json({
//       error: "internal server error",
//       msg: "failed",
//       success: false,
//       data: [],
//     });
//   }
// };

const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: "Course ID is required",
        msg: "failed",
        success: false,
        data: null,
      });
    }

    const course_data = await CourseMasterModel.findById(id)
      .populate({ path: "instrument", select: "instrument_title" })
      .lean();
    if (!course_data) {
      return res.status(404).json({
        error: "Course not found",
        msg: "failed",
        success: false,
        data: null,
      });
    }

    const lectures_data = await LectureModel.find({ course: id }).lean();
    
    let isPurchased = false;

    // ==== Admin always has access ====
    if (req.user?.role === "admin") {
      isPurchased = true;
    }

    else if (req.user?.id) {
      const purchasedCourseIds = await OrderModel.distinct(
        "items.productId",
        {
          userId: req.user.id,
          paymentStatus: "paid",
          "items.productType": "course_masters",
        }
      );

      const purchasedSet = new Set(
        purchasedCourseIds.map(cid => cid.toString())
      );

      isPurchased = purchasedSet.has(id.toString());
    }

    const data = {
      course_data: {
        ...course_data,
        isPurchased,
      },
      lectures_data,
    };


    // const data = {
    //   course_data,
    //   lectures_data,
    // };

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

const UpdateCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const {
      course_title,
      course_description,
      course_price,
      existing_images,
      new_images,
    } = req.body;

    if (course_title) {
      const duplicate = await CourseMasterModel.findOne({
        course_title: course_title.trim(),
        _id: { $ne: courseId }, // <-- exclude current record
      }).lean();

      if (duplicate) {
        return res.status(400).json({
          error: "",
          success: false,
          msg: "Course title already exists",
          data: [],
        });
      }
    }

   const existingData = await CourseMasterModel.findById(courseId);
    if (!existingData) {
      return res.status(404).json({
        error: "",
        msg: "Course not found",
        success: false,
        data: [],
      });
    }

    const oldImagesFlat = existingData.thumbnail_image
      .map((img) => {
        return {
          key: img.key,
          url: img.url,
          originalName: img.originalName || img.key.split("/").pop(),
          mimeType: img.mimeType || "image/jpeg",
          size: img.size || 0,
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
      thumbnail_image: finalImages,
    };
    if (course_title !== undefined)
      updatePayload.course_title = course_title.trim();
    if (course_description !== undefined)
      updatePayload.course_description = course_description;
    if (course_price !== undefined)
      updatePayload.course_price = Number(course_price);

    const updatedCourse = await CourseMasterModel.findByIdAndUpdate(
      courseId,
      updatePayload,
      { new: true }
    );

    res.status(200).json({
      error: "",
      msg: "Course updated success",
      success: true,
      data: updatedCourse,
    });
  
  } catch (err) {
    console.log("error", err);

    res.status(500).json({
      error: "internal server error",
      msg: "Course update failed",
      success: false,
      data: [],
    });
  }
};

const DeleteCourse = async (req, res) => {
  try {
    const courseId = req.params.id;

    const course = await CourseMasterModel.findById(courseId).lean();

    if (!course) {
      return res.status(404).json({
        error: "",
        success: false,
        msg: "Course not found",
        data: [],
      });
    }

    const images = Array.isArray(course.thumbnail_image)
      ? course.thumbnail_image
      : [];

    const flatImages = images
      .map((img) => {
        return {
          key: img.key,
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

    const lectures = await LectureModel.find({
      course: courseId,
    }).lean();

    for (const lecture of lectures) {
      if (!Array.isArray(lecture.lecture_video)) continue;
      for (const video of lecture.lecture_video) {
        if (!video?.key) continue;
        try {
          await s3.send(
            new DeleteObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key: video.key,
            })
          );
          console.log("Deleted Lecture Video:", video.key);
        } catch (err) {
          console.log("⚠ Failed deleting lecture video:", video.key, err);
        }
      }
    }
    
   await LectureModel.deleteMany({ course: courseId });
   await CourseMasterModel.findByIdAndDelete(courseId);

    return res.status(200).json({
      error: "",
      success: true,
      msg: "Course deleted successfully",
      data: [],
    });

  } catch (err) {
    console.log("Error deleting course:", err);
    return res.status(500).json({
      error: "Internal server error",
      success: false,
      msg: "Course delete failed",
      data: [],
    });
  }
};

const AddLecture = async (req, res) => {
  try {
    const { course_id, lecture_title, lecture_video } = req.body;

    const existingLectureTitle = await LectureModel.findOne({
      lecture_title: lecture_title.trim(),
    }).lean();

    if (existingLectureTitle) {
      return res.status(400).json({
        error: "",
        success: false,
        msg: "Leacture title already exists",
        data: [],
      });
    }

    //course_id, lecture_title
    const addedLecture = await LectureModel.create({
      course: course_id,
      lecture_title,
      lecture_video
    });

    return res.status(200).json({
      error: "",
      msg: "Lecture added successfully, You can add more lecture or view uploaded leactures or create new course by click on below link",
      success: true,
      data: addedLecture,
    });

  } catch (err) {
    console.error("AddCourse error:", err);
    res.status(500).json({
      error: "internal server error",
      msg: "Course add failed",
      success: false,
      data: [],
    });
  }
};

const UpdateLecture = async (req, res) => {
  try {
    const lectureId = req.params.id;
    const { lecture_title, new_videos, existing_videos } = req.body;
    if (lecture_title) {
      const duplicate = await LectureModel.findOne({
        lecture_title: lecture_title.trim(),
        _id: { $ne: lectureId }, // <-- exclude current record
      }).lean();

      if (duplicate) {
        return res.status(400).json({
          error: "",
          success: false,
          msg: "Lecture title already exists",
          data: [],
        });
      }
    }

    const existingData = await LectureModel.findById(lectureId);
    if (!existingData) {
      return res.status(404).json({
        error: "",
        msg: "Lecture not found",
        success: false,
        data: [],
      });
    }

    const oldVideosFlat = existingData.lecture_video
      .map((video) => {
        return {
          key: video.key,
          url: video.url,
          originalName: video.originalName || video.key.split("/").pop(),
          mimeType: video.mimeType || "",
          size: video.size || 0,
        };
      })
      .filter(Boolean);

    const removedVideos = oldVideosFlat.filter(
      (video) => !existing_videos.some((e) => e.key === video.key),
    );

    for (const video of removedVideos) {
      if (!video.key) continue;

      await s3.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: video.key,
        }),
      );
    }

    const finalVideos = [...existing_videos, ...new_videos];

    const updatedLecture = await LectureModel.findByIdAndUpdate(
      lectureId,
      {
        lecture_title,
        lecture_video: finalVideos,
      },
      { new: true },
    );

    res.status(200).json({
      error: "",
      msg: "Lecture updated success",
      success: true,
      data: updatedLecture,
    });
  } catch (err) {
    console.log("error", err);
    res.status(500).json({
      error: "internal server error",
      msg: "Lecture update failed",
      success: false,
      data: [],
    });
  }
};

const DeleteLecture = async (req, res) => {
  try {
    const lectureId = req.params.id;
    const lecture = await LectureModel.findById(lectureId).lean();

    if (!lecture) {
      return res.status(404).json({
        error: "",
        success: false,
        msg: "Lecture not found",
        data: [],
      });
    }

    const lectureVideos = lecture.lecture_video.map((video) => {
        return {
          key: video.key,
        };
      })
      .filter(Boolean); 

    for (const video of lectureVideos) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: video.key,
          })
        );
        // console.log("Deleted from S3:", video.key);
      } catch (s3Error) {
        console.log("⚠ S3 Delete Failed For:", video.key, s3Error);
      }
    }

   await LectureModel.findByIdAndDelete(lectureId);

    return res.status(200).json({
      error: "",
      success: true,
      msg: "lecture deleted successfully",
      data: [],
    });

  } catch (err) {
    console.log("Error deleting lecture:", err);
    return res.status(500).json({
      error: "Internal server error",
      success: false,
      msg: "lecture delete failed",
      data: [],
    });
  }
};

module.exports = {
  CheckCourseTitle,
  CreateCourse,
  UpdateCourse,
  DeleteCourse,
  AddLecture,
  UpdateLecture,
  DeleteLecture,
  getAllCourses,
  getCourseById,
  LandingGetAllCourses
};
