const express = require('express');
const connectDB = require('./config/db');
require('dotenv').config();
const cron = require('node-cron');
const Poll = require('./models/poll'); // 
const mongoose= require('mongoose');

const app = express();
app.use(express.json());

connectDB();
mongoose.set('debug', true);

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/polls', require('./routes/pollRoutes'));
app.use('/account', require('./routes/recoverAccount'));



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
