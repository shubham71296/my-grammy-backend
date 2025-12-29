
require('dotenv').config();
const cors = require('cors');
const mongoose = require('mongoose');
const express = require('express');
const connectDB = require('./config/db');

const app = express();

const allowedOrigins = [
  'https://grammymusicindia.in',
  'https://www.grammymusicindia.in'
];

app.use(cors({
  origin: function(origin, callback){
    if(!origin) return callback(null, true); // allow curl/postman etc.
    if(allowedOrigins.indexOf(origin) === -1){
      return callback(new Error('CORS not allowed'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['x-rtb-fingerprint-id'], // lets frontend read Razorpay header
  optionsSuccessStatus: 200
}));


// app.use(cors({
//     origin: '*',
//     optionsSuccessStatus: 200,
//     allowedHeaders: ['Content-Type', 'Authorization'],
//     credentials: true
// }));


app.use(
  "/webhook",
  express.raw({ type: "application/json" }),
  require("./routes/razorpayWebhook")
);


app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
// app.use(express.raw({ type: 'application/octet-stream', limit: '100mb' }));

app.use('/api', require('./routes'));

connectDB();

app.listen(process.env.PORT, () => console.log(`Server is running on ${process.env.PORT}`));

module.exports = app;
