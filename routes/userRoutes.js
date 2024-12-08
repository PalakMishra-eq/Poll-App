const express = require('express');
const upload = require('../middlewares/multer'); // Multer for file uploads
const { 
  uploadProfilePicture, 
  updateBioAndInterests, 
  removeInterest, 
  listInterests 
} = require('../controllers/profileController');
const { auth, roleAuthorization } = require('../middlewares/authMiddleware');

const router = express.Router();

// Profile Picture Upload
router.post('/upload-profile', auth, roleAuthorization(['Voter']), upload.single('profilePicture'), uploadProfilePicture);

// Update Bio
router.put('/update-profile', auth, roleAuthorization(['Voter']), updateBioAndInterests);
// router.put('/update-bio', (req, res) => {
//     res.send('Test update-bio route works');
//   });
  

// Manage Interests
//router.post('/add-interest', auth, roleAuthorization(['Voter']), addInterest);
router.delete('/remove-interest', auth, roleAuthorization(['Voter']), removeInterest);
router.get('/list-interests', auth, roleAuthorization(['Voter']), listInterests);

module.exports = router;
