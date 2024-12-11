const express = require('express');
const upload = require('../middlewares/multer'); // Multer for file uploads
const { 
  uploadProfilePicture, 
  updateBioAndInterests, 
  getUserProfile
} = require('../controllers/profileController');
const { auth, roleAuthorization } = require('../middlewares/authMiddleware');

const router = express.Router();

// Profile Picture Upload
router.post('/upload-profile', auth, roleAuthorization(['Voter']), upload.single('profilePicture'), uploadProfilePicture);

// Update Bio
router.put('/update-profile', auth, roleAuthorization(['Voter']), updateBioAndInterests);

//fetch profile
router.get('/profile', auth, roleAuthorization(['Voter']), getUserProfile );

module.exports = router;
