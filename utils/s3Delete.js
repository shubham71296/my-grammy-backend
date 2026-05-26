const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require("../config/aws");

const DEFAULT_CONCURRENCY = 8;

/**
 * Delete S3 objects in parallel batches. Failures are logged, not thrown.
 */
async function deleteS3Keys(keys, concurrency = DEFAULT_CONCURRENCY) {
  const unique = [...new Set((keys || []).filter(Boolean))];
  for (let i = 0; i < unique.length; i += concurrency) {
    const batch = unique.slice(i, i + concurrency);
    await Promise.all(
      batch.map((Key) =>
        s3
          .send(
            new DeleteObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME,
              Key,
            })
          )
          .catch((err) => console.log("S3 delete failed:", Key, err.message))
      )
    );
  }
}

module.exports = { deleteS3Keys };
