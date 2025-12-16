const express = require("express");
const router = express.Router();
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = require("../config/aws");

// 🔐 middleware example (JWT / session)
const auth = require("../middleware/auth");
const LectureModel = require("../models/LectureModel");
const checkUserPurchasedCourse = require("../utils/checkCourseAccess");

// GET /api/video/stream?key=private-course-videos/xxx.mp4
router.get("/stream", auth, async (req, res) => {
  try {
    //console.log("req.user",req.user)
    const { key, lectureId } = req.query;

    if (!key || !lectureId) {
      return res.status(400).json({ error:"", success: false, msg: "Video key and lectureId required" });
    }

    // 🔒 Safety check: only private folder allowed
    if (!key.startsWith("private-course-videos/")) {
      return res.status(403).json({ error:"", success: false, msg: "Invalid video path" });
    }

    const lecture = await LectureModel.findById(lectureId).populate("course");
    if (!lecture) {
      return res.status(404).json({
        success: false,
        msg: "Lecture not found",
      });
    }

    if (req.user.role !== "admin") {
      const hasAccess = await checkUserPurchasedCourse(
        req.user.id,
        lecture.course._id
      );

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          msg: "You have not purchased this course",
        });
      }
    }

    // ⛔ OPTIONAL: payment / enrollment check
    // const hasAccess = await checkUserPurchasedCourse(req.user.id, key);
    // if (!hasAccess) return res.status(403).json({ msg: "Not allowed" });

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
    });

    // ⏱ URL valid for 5 minutes
    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: 60 * 5,
      //expiresIn: 20
    });

    return res.json({
      error:"",
      success: true,
      url: signedUrl,
    });
  } catch (err) {
    console.error("video stream error", err);
    res.status(500).json({ success: false, msg: "Failed to generate stream URL" });
  }
});

module.exports.router = router;
