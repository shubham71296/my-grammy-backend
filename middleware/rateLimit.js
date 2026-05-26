const buckets = new Map();

/**
 * Simple in-memory rate limiter (per IP + optional path prefix).
 */
function rateLimit({ windowMs = 60_000, max = 20, keyPrefix = "" } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0 };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      return res.status(429).json({
        success: false,
        msg: "Too many requests. Please try again later.",
      });
    }
    next();
  };
}

module.exports = { rateLimit };
