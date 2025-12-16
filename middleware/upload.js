// middlewares/upload.js
const multer = require("multer");

// Use memory storage because we upload manually to S3
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200 MB
  },
});

module.exports = upload;
