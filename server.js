
require('dotenv').config();
const cors = require('cors');
const mongoose = require('mongoose');
const express = require('express');
const connectDB = require('./config/db');

const app = express();




app.use(cors({
    origin: '*',
    optionsSuccessStatus: 200,
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use('/webhook', 
  express.raw({ type: 'application/json' }), 
  require('./routes/webhook')
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '100mb' }));

app.use('/api', require('./routes'));

//mongoose.connect("mongodb://localhost:27017/musically", {});
connectDB();

app.listen(process.env.PORT, () => console.log(`Server is running on ${process.env.PORT}`));

module.exports = app;
