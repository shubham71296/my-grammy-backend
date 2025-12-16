// routes/upload-multipart.js
const express = require("express");
const router = express.Router();
const { CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = require("../config/aws"); // your existing S3Client
const { randomUUID } = require("crypto");

function isPublicFolder(folder) {
  if (!folder) return false;
  return folder.startsWith("public-") || folder.startsWith("images") || folder.includes("thumbnail");
}

// POST /api/upload/multipart/init
router.post("/multipart/init", async (req, res) => {
  try {
    const { fileName, fileType, folder = "uploads" } = req.body;
    if (!fileName) return res.status(400).json({ success: false, msg: "fileName required" });

    const safeName = fileName.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
    const key = `${folder}/${Date.now()}-${randomUUID()}-${safeName}`;

    const publicObject = isPublicFolder(folder);

    const cmd = new CreateMultipartUploadCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: fileType || "application/octet-stream",
      //...(publicObject ? { ACL: "public-read" } : {}),
    });
    const resp = await s3.send(cmd);
    return res.json({ success: true, key, uploadId: resp.UploadId });
  } catch (err) {
    console.error("init multipart error", err);
    return res.status(500).json({ success: false, msg: "init failed" });
  }
});

// POST /api/upload/multipart/presign
router.post("/multipart/presign", async (req, res) => {
  try {
    const { key, uploadId, parts } = req.body;
    if (!key || !uploadId || !parts) return res.status(400).json({ success: false, msg: "missing" });

    const wantedParts = typeof parts === "number" ? Array.from({ length: parts }, (_, i) => i + 1) : parts;
    const expiresIn = 60 * 10;
    const uploads = await Promise.all(
      wantedParts.map(async (PartNumber) => {
        const cmd = new UploadPartCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
          UploadId: uploadId,
          PartNumber,
        });
        const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn });
        return { PartNumber, uploadUrl };
      })
    );
    return res.json({ success: true, uploads });
  } catch (err) {
    console.error("presign parts error", err);
    return res.status(500).json({ success: false, msg: "presign failed" });
  }
});

// POST /api/upload/multipart/complete
router.post("/multipart/complete", async (req, res) => {
  try {
    const { key, uploadId, parts } = req.body;
    if (!key || !uploadId || !Array.isArray(parts)) return res.status(400).json({ success: false, msg: "missing" });

    const completeCmd = new CompleteMultipartUploadCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts.map((p) => ({ ETag: p.ETag, PartNumber: p.PartNumber })) },
    });
    
    const folder = key.split("/")[0];
    const publicObject = isPublicFolder(folder);

    // const resp = await s3.send(completeCmd);
    // const location = resp.Location || `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    // return res.json({ success: true, location, resp });
    return res.json({ 
      success: true, 
      key, 
      ...(publicObject
      ? {
          url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
        }
      : {}), 
    });
  } catch (err) {
    console.error("complete multipart error", err);
    return res.status(500).json({ success: false, msg: "complete failed" });
  }
});

// Optional: abort multipart
router.post("/multipart/abort", async (req, res) => {
  try {
    const { key, uploadId } = req.body;
    if (!key || !uploadId) return res.status(400).json({ success: false, msg: "missing" });
    await s3.send(new AbortMultipartUploadCommand({ Bucket: process.env.AWS_BUCKET_NAME, Key: key, UploadId: uploadId }));
    return res.json({ success: true });
  } catch (err) {
    console.error("abort multipart error", err);
    return res.status(500).json({ success: false, msg: "abort failed" });
  }
});

module.exports.router = router;
