const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

module.exports.uploadBase64File = async (base64String, fileName, folderName) => {
  const base64Data = base64String.split(";base64,").pop();
  const mimeType = base64String.substring(
    base64String.indexOf(":") + 1,
    base64String.indexOf(";")
  );
  const buffer = Buffer.from(base64Data, "base64");

  const key = `${folderName}/${Date.now()}_${fileName}`;

  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentEncoding: "base64",
    ContentType: mimeType,
  };

  await s3.send(new PutObjectCommand(uploadParams));

  return {
    name: fileName,
    type: mimeType,
    size: buffer.length,
    url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
    // Location: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
  };
};
