const express = require('express');
const path = require('path');
const connectDB = require('./config/db');
require('dotenv').config();
const cron = require('node-cron');
const Poll = require('./models/poll'); 
const mongoose = require('mongoose');
const cors = require('cors')

const app = express();
app.use(express.json());
app.use(cors());

const { notifyUsersAboutPolls } = require('./controllers/pollController');

// Schedule the job to run daily at 9 AM
cron.schedule('0 9 * * *', async () => {
  console.log('Running scheduled poll notification task...');
  await notifyUsersAboutPolls();
});



(async () => {
  try {
    console.log('Starting poll notification test...');
    await notifyUsersAboutPolls();
    console.log('Poll notification test completed.');
  } catch (error) {
    console.error('Error in poll notification test:', error.message);
  }
})();



// Log incoming requests (move this higher)
app.use((req, res, next) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    next();
});

// Serve uploaded files
//app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', (req, res, next) => {
    console.log(`Static file request for: ${req.path}`);
    next();
  }, express.static(path.join(__dirname, 'uploads')));
  

app.get('/', (req, res) => {
    res.send('API is running');
}); 

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/polls', require('./routes/pollRoutes'));
app.use('/account', require('./routes/recoverAccount'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/votes', require('./routes/pollRoutes')); 


// Add user routes
app.use('/api/users', require('./routes/userRoutes'));

// Error Handling for Unhandled Routes
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

  
  connectDB();
  mongoose.set('debug', true);
  


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
