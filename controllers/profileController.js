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

    user.profilePicture = req.file.path;
    await user.save();

    res.status(200).json({ message: 'Profile picture uploaded successfully', profilePicture: req.file.path });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
};

// Update Bio
exports.updateBio = async (req, res) => {
    console.log('Inside updateBio function');
  try {
    const { bio } = req.body;
    const userId = req.user.id;

    console.log('Bio:', bio, 'User ID:', userId);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.bio = bio;
    await user.save();

    res.status(200).json({ message: 'Bio updated successfully', bio });
  } catch (error) {
    console.error('Error updating bio:', error);
    res.status(500).json({ error: 'Failed to update bio' });
  }
};


// Manage Interests
exports.addInterest = async (req, res) => {
  try {
    const { interest } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.interests.includes(interest)) {
      user.interests.push(interest);
      await user.save();
    }

    res.status(200).json({ message: 'Interest added successfully', interests: user.interests });
  } catch (error) {
    console.error('Error adding interest:', error);
    res.status(500).json({ error: 'Failed to add interest' });
  }
};

exports.removeInterest = async (req, res) => {
  try {
    const { interest } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.interests = user.interests.filter((i) => i !== interest);
    await user.save();

    res.status(200).json({ message: 'Interest removed successfully', interests: user.interests });
  } catch (error) {
    console.error('Error removing interest:', error);
    res.status(500).json({ error: 'Failed to remove interest' });
  }
};

exports.listInterests = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.status(200).json({ interests: user.interests });
  } catch (error) {
    console.error('Error listing interests:', error);
    res.status(500).json({ error: 'Failed to list interests' });
  }
};
