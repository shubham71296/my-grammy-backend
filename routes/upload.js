// routes/upload.js
const express = require("express");
const router = express.Router();
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { randomUUID } = require("crypto");

// reuse your existing S3 client from config/aws.js
const s3 = require("../config/aws");

// POST /api/upload/presign

function isPublicFolder(folder) {
  if (!folder) return false;
  return folder.startsWith("public-") || folder.startsWith("images") || folder.includes("thumbnail");
}


router.post("/presign", async (req, res) => {
  try {
    const { files = [] } = req.body;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, msg: "No files provided" });
    }
    if (files.length > 20) return res.status(400).json({ success: false, msg: "Too many files" });

    const expiresInSeconds = 60 * 10; // 10 minutes
    const uploads = await Promise.all(
      files.map(async (f) => {
        const safeName = (f.name || "file").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
        const folder = (f.folder || "uploads").replace(/[^a-zA-Z0-9/_-]/g, "");
        const key = `${folder}/${Date.now()}-${randomUUID()}-${safeName}`;

        const publicObject = isPublicFolder(folder);

        const cmd = new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
          ContentType: f.type || "application/octet-stream",
          //...(publicObject ? { ACL: "public-read" } : {}),
        });

        const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });
        //const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

        return {
          key,
          //url,
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
    res.status(500).json({ success: false, msg: "Failed to generate presigned URLs" });
  }
});

module.exports.router = router;
