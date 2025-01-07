const User = require('../models/User');

// Upload Profile Picture
exports.uploadProfilePicture = async (req, res) => {
  try {
    const { userId } = req.body;
    console.log("inside upp function", userId);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.profilePicture =  `/uploads/${req.file.filename}`;
    await user.save();

    res.status(200).json({ 
      message: 'Profile picture uploaded successfully', 
      profilePicture: user.profilePicture,
     });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
};

// Update Bio
exports.updateBioAndInterests = async (req, res) => {
    console.log('Inside updateBioInterests function');
  try {
    const { bio, interests } = req.body;
    const userId = req.user.id;

    console.log('Bio:', bio, 'User ID:', userId, 'interests:', interests);

    // Validate input
    if (!bio && (!interests || !Array.isArray(interests))) {
      return res.status(400).json({ error: 'Bio or interests must be provided' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update bio and interests
    if (bio) user.bio = bio;
    if (interests) user.interests = interests;

    await user.save();

    res.status(200).json({ message: 'Profile updated successfully',
      bio: user.bio,
      interests: user.interests,
     });
  } catch (error) {
    console.error('Error updating bio:', error);
    res.status(500).json({ error: 'Failed to update bio' });
  }
};

exports.getUserProfile = async (req, res) => {
  try{
    const userId = req.user.id;

    const user = await User.findById(userId, 'profilePicture bio interests username email');
    if (!user){
      return res.status(404).json({error: 'User not found'});

    }


    const profileData= {
      username: user.username,
      email: user.email,
      profilePicture: 'https://interpolls.onrender.com'+user.profilePicture || '',
      bio: user.bio || '',
      interests: user.interests || [],

    };
    res.status(200).json(profileData);
  } catch (error) {
    console.error('Error fetching user profile:', error.message);
    res.status(500).json({error: 'Failed to fetch user profile'});
  }
};