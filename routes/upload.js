// routes/upload.js
const express = require("express");
const router = express.Router();
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { deleteS3Keys } = require("../utils/s3Delete");
const { randomUUID } = require("crypto");
const s3 = require("../config/aws");

function isPublicFolder(folder) {
  if (!folder) return false;
  return (
    folder.startsWith("public-") ||
    folder.startsWith("images") ||
    folder.includes("thumbnail")
  );
}

router.post("/presign", async (req, res) => {
  try {
    const { files = [] } = req.body;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, msg: "No files provided" });
    }
    if (files.length > 20) {
      return res.status(400).json({ success: false, msg: "Too many files" });
    }

    const expiresInSeconds = 60 * 10;
    const uploads = await Promise.all(
      files.map(async (f) => {
        const safeName = (f.name || "file")
          .replace(/\s+/g, "_")
          .replace(/[^a-zA-Z0-9._-]/g, "");
        const folder = (f.folder || "uploads").replace(/[^a-zA-Z0-9/_-]/g, "");
        const key = `${folder}/${Date.now()}-${randomUUID()}-${safeName}`;

        const publicObject = isPublicFolder(folder);

        const cmd = new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
          ContentType: f.type || "application/octet-stream",
        });

        const uploadUrl = await getSignedUrl(s3, cmd, {
          expiresIn: expiresInSeconds,
        });

        return {
          key,
          uploadUrl,
          originalName: f.name,
          mimeType: f.type,
          ...(publicObject
            ? {
                url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
              }
            : {}),
        };
      })
    );

    res.json({ success: true, uploads });
  } catch (err) {
    console.error("presignUploads err", err);
    res.status(500).json({
      success: false,
      msg: "Failed to generate presigned URLs",
    });
  }
});

/** Delete orphaned S3 keys after failed create/update (requires admin on /api/upload mount). */
router.post("/rollback", async (req, res) => {
  try {
    const keys = Array.isArray(req.body?.keys) ? req.body.keys : [];
    if (keys.length === 0) {
      return res.json({ success: true, msg: "Nothing to rollback" });
    }
    await deleteS3Keys(keys);
    return res.json({ success: true, msg: "Upload rollback complete" });
  } catch (err) {
    console.error("S3 rollback error:", err);
    return res.status(500).json({ success: false, msg: "Rollback failed" });
  }
});

module.exports.router = router;
