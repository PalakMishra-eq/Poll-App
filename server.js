const express = require('express');
const connectDB = require('./config/db');
require('dotenv').config();
const cron = require('node-cron');
const Poll = require('./models/poll'); 
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// Log incoming requests (move this higher)
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
});

connectDB();
mongoose.set('debug', true);

app.get('/', (req, res) => {
    res.send('API is running');
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/polls', require('./routes/pollRoutes'));
app.use('/account', require('./routes/recoverAccount'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/votes', require('./routes/pollRoutes'));
// Error Handling for Unhandled Routes
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

const path = require('path');

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Add user routes
app.use('/api/users', require('./routes/userRoutes'));


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
