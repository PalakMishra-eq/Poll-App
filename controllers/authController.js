const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
//const nodemailer = require('nodemailer');
require('dotenv').config();
//const { sendMail } = require('../utils/mailer');//
const axios = require('axios');

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
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
};



// // Recover Account
// exports.recoverAccount = async (req, res) => {
//   const { email, securityAnswer } = req.body; // Expect email and security answer from the user
//   try {
//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     // Verify the security question answer
//     if (user.securityAnswer !== securityAnswer) {
//       return res.status(400).json({ message: 'Security answer is incorrect' });
//     }

//     // Generate a unique token for password reset
//     const resetToken = crypto.randomBytes(32).toString('hex');
//     user.resetPasswordToken = resetToken;
//     user.resetPasswordExpires = Date.now() + 3600000; // 1-hour expiry
//     await user.save();

//     // Send the reset token (instead of a link)
//     res.json({
//       message: 'Recovery token generated. Use this token to reset your password.',
//       resetToken,
//     });
//   } catch (error) {
//     console.error('Error in recoverAccount:', error.message);
//     res.status(500).json({ error: 'Failed to process recovery request' });
//   }
// };

exports.recoverAccount = async (req, res) => {
  const { email, securityAnswer } = req.body; // Expect email and security answer from the user

  try {
    console.log('Recover Account API hit');
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    console.log('User found:', user);

    // Verify the security question answer
    if (user.securityAnswer !== securityAnswer) {
      return res.status(400).json({ message: 'Security answer is incorrect' });
    }

    console.log('Security answer verified');

    // Generate a unique reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1-hour expiry
    await user.save();

    console.log('Reset token generated and saved:', resetToken);

    // Configure EmailJS API payload
    const emailPayload = {
      service_id: 'default_service', // Replace with your EmailJS service ID
      template_id: 'template_dstb2ly', // Replace with your EmailJS template ID
      user_id: '9cJEd9YMVAn85IFhE', // Replace with your EmailJS public key (user ID)
      template_params: {
        email: user.email, // Recipient's email
        resetToken: resetToken, // The generated reset token
        subject: 'Account Recovery', // Subject line (optional, depending on template)
      },
    };

    console.log('EmailJS payload:', emailPayload);

    // Send email using EmailJS API
    const response = await axios.post(
      'https://api.emailjs.com/api/v1.0/email/send',
      emailPayload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('EmailJS response:', response.data);

    // Handle successful email send
    if (response.status === 200) {
      res.status(200).json({
        message: 'Recovery email sent successfully',
        resetToken, // Include the reset token for debugging (remove in production)
      });
    } else {
      console.log('Failed to send email, status:', response.status);
      res.status(500).json({ error: 'Failed to send recovery email' });
    }
  } catch (error) {
    console.error('Error in recoverAccount:', error.message);
    console.error('Full Error:', error);
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

