const path = require("path");
const dotenv = require("dotenv");

// Always load .env from backend root (works regardless of cwd)
dotenv.config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const isSet = (key) => {
  const value = process.env[key];
  return value != null && String(value).trim() !== "";
};

/** Server cannot start without these */
const REQUIRED_CORE = ["MONGODB_URI", "PORT", "JWT_SECRET"];

/** Needed for checkout UI; warn if missing in dev */
const REQUIRED_RAZORPAY = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"];

/** Optional for local dev — features disabled if unset */
const OPTIONAL_WARN = [
  "RAZORPAY_WEBHOOK_SECRET",
  "AWS_BUCKET_NAME",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "EMAIL_USER",
  "PASSWORD_USER",
];

function validateEnv() {
  const missingCore = REQUIRED_CORE.filter((key) => !isSet(key));
  if (missingCore.length) {
    console.error(
      "Missing required environment variables:",
      missingCore.join(", ")
    );
    console.error(
      "Copy my-grammy-backend/.env.example to .env and fill in values."
    );
    process.exit(1);
  }

  const missingRazorpay = REQUIRED_RAZORPAY.filter((key) => !isSet(key));
  if (missingRazorpay.length) {
    console.warn(
      "⚠️  Razorpay keys missing — checkout will fail:",
      missingRazorpay.join(", ")
    );
  }

  const missingOptional = OPTIONAL_WARN.filter((key) => !isSet(key));
  if (missingOptional.length) {
    console.warn(
      "⚠️  Optional services not configured (OK for local catalog browsing):",
      missingOptional.join(", ")
    );
  }
}

module.exports = { validateEnv };
