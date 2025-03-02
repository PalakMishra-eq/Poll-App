const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();
const { sendMail } = require('../utils/mailer');
const axios = require('axios');
const { gmail } = require('googleapis/build/src/apis/gmail');

// Generate JWT
const generateToken = (user) => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

exports.signUp = async (req, res) => {
  try {
    const { username, email, password, securityQuestion, securityAnswer, role } = req.body;
    const user = new User({ username, email, password, securityQuestion, securityAnswer, role });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error("SignUp error:", error.message);
    res.status(500).json({ error: 'Error registering user' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = generateToken(user);

    res.json({ token, userId: user._id, userRole: user.role });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
};



exports.recoverAccount = async (req, res) => {
  const { email, securityAnswer } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Verify the security question answer
    if (user.securityAnswer !== securityAnswer) {
      return res.status(400).json({ message: 'Security answer is incorrect' });
    }

    // Generate a unique reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1-hour expiry
    await user.save();

    // Send recovery email using the sendMail function
    const subject = 'Account Recovery';
    const text = `Here is your reset token: ${resetToken}. This token is valid for 1 hour.`;

    await sendMail(user.email, subject, text);

    res.status(200).json({
      message: 'Recovery email sent successfully',
      resetToken, // For debugging only; remove in production
    });
  } catch (error) {
    console.error('Error in recoverAccount:', error.message);
    res.status(500).json({ error: 'Failed to process recovery request' });
  }
};


  // Reset Password
exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body; // Accept token and new password from the user
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // Ensure token is valid and not expired
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

    // Hash and update the password
    user.password = await bcrypt.hash(newPassword, 10);

    // Clear the reset token and expiry fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Password has been successfully reset' });
  } catch (error) {
    console.error('Error in resetPassword:', error.message);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

