const CourseMasterModel = require("../../../models/CourseMasterModel");
const LectureModel = require("../../../models/LectureModel");
const { listDocuments } = require("../../../utils/listDocuments");
const { enrichCoursesWithPurchase } = require("../../../utils/coursePurchase");
const { loadCourseDetail } = require("../../../utils/loadCourseDetail");
const { deleteS3Keys } = require("../../../utils/s3Delete");
const { parseNonNegativePrice } = require("../../../utils/parsePrice");
const { diffRemovedMedia, collectS3Keys } = require("../../../utils/normalizeMedia");
const { withTransaction } = require("../../../utils/withTransaction");


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
    
    const priceParsed = parseNonNegativePrice(course_price, "course price");
    if (!priceParsed.ok) {
      return res.status(400).json({ error: "", success: false, msg: priceParsed.msg, data: [] });
    }
    const priceNum = priceParsed.value;
 
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

const COURSE_QUERY_FIELDS = [
  "course_title",
  "course_price",
  "course_description",
  "instrument",
  "createdAt",
  "updatedAt",
];

const getAllCourses = (req, res) =>
  listDocuments({
    Model: CourseMasterModel,
    req,
    res,
    allowedQueryFields: COURSE_QUERY_FIELDS,
    populate: { path: "instrument", select: "instrument_title" },
    transform: (courses, request) => enrichCoursesWithPurchase(courses, request.user),
  });

const GuestGetAllCourses = (req, res) =>
  listDocuments({
    Model: CourseMasterModel,
    req,
    res,
    allowedQueryFields: COURSE_QUERY_FIELDS,
    populate: { path: "instrument", select: "instrument_title" },
  });

const sendCourseDetail = async (req, res, user) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({
      error: "Course ID is required",
      msg: "failed",
      success: false,
      data: null,
    });
  }
  const data = await loadCourseDetail(id, user);
  if (!data) {
    return res.status(404).json({
      error: "Course not found",
      msg: "failed",
      success: false,
      data: null,
    });
  }
  return res.status(200).json({ error: "", msg: "success", success: true, data });
};

const getCourseById = async (req, res) => {
  try {
    return await sendCourseDetail(req, res, req.user);
  } catch (err) {
    return res.status(500).json({
      error: "internal server error",
      msg: "failed",
      success: false,
      data: [],
    });
  }
};

const GuestGetCourseById = async (req, res) => {
  try {
    return await sendCourseDetail(req, res, null);
  } catch (err) {
    return res.status(500).json({
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

    const removedImages = diffRemovedMedia(
      existingData.thumbnail_image,
      existing_images
    );

    await deleteS3Keys(removedImages.map((img) => img.key));

    const finalImages = [...existing_images, ...new_images];
    const updatePayload = {
      thumbnail_image: finalImages,
    };
    if (course_title !== undefined)
      updatePayload.course_title = course_title.trim();
    if (course_description !== undefined)
      updatePayload.course_description = course_description;
    if (course_price !== undefined) {
      const priceParsed = parseNonNegativePrice(course_price, "course price");
      if (!priceParsed.ok) {
        return res.status(400).json({
          error: "",
          success: false,
          msg: priceParsed.msg,
          data: [],
        });
      }
      updatePayload.course_price = priceParsed.value;
    }

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

    const lectures = await LectureModel.find({ course: courseId }).lean();
    const s3Keys = [
      ...collectS3Keys(course.thumbnail_image || []),
      ...lectures.flatMap((lec) => collectS3Keys(lec.lecture_video || [])),
    ];
    await withTransaction(async (session) => {
      const opts = session ? { session } : {};
      await LectureModel.deleteMany({ course: courseId }, opts);
      await CourseMasterModel.findByIdAndDelete(courseId, opts);
    });

    await deleteS3Keys(s3Keys);

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
      course: course_id,
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
    const existingData = await LectureModel.findById(lectureId);
    if (!existingData) {
      return res.status(404).json({
        error: "",
        msg: "Lecture not found",
        success: false,
        data: [],
      });
    }

    if (lecture_title) {
      const duplicate = await LectureModel.findOne({
        lecture_title: lecture_title.trim(),
        course: existingData.course,
        _id: { $ne: lectureId },
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

    const removedVideos = diffRemovedMedia(
      existingData.lecture_video,
      existing_videos
    );

    await deleteS3Keys(removedVideos.map((video) => video.key));

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

    await deleteS3Keys(collectS3Keys(lecture.lecture_video || []));

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
  GuestGetAllCourses,
  getCourseById,
  GuestGetCourseById
};
