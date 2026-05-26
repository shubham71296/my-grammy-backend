
const { validateEnv } = require('./config/env');
validateEnv();

const cors = require('cors');
const express = require('express');
const connectDB = require('./config/db');

const app = express();

const productionOrigins = [
  'https://grammymusicindia.in',
  'https://www.grammymusicindia.in',
];

const envOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...productionOrigins, ...envOrigins])];

const isLocalDevOrigin = (origin) => {
  try {
    const { hostname, protocol } = new URL(origin);
    if (!['http:', 'https:'].includes(protocol)) return false;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

const isDev = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (isDev && isLocalDevOrigin(origin)) return callback(null, true);
    console.warn('CORS blocked origin:', origin);
    return callback(new Error('CORS not allowed'), false);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['x-rtb-fingerprint-id'],
  optionsSuccessStatus: 200,
}));


app.use(
  "/webhook",
  express.raw({ type: "application/json" }),
  require("./routes/razorpayWebhook")
);


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', require('./routes'));

const startServer = async () => {
  await connectDB();
  app.listen(process.env.PORT, () => console.log(`Server is running on ${process.env.PORT}`));
};

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

module.exports = app;
