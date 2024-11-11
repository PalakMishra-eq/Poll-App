const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
require('dotenv').config();
const { sendMail } = require('../utils/mailer');//
const crypto = require('crypto'); //

// Generate JWT
const generateToken = (user) => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

exports.signUp = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const user = new User({ username, email, password, role });
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

// exports.recoverAccount = async (req, res) => {
//   const { email } = req.body;
//   try {
//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     // Send reset link (you would typically generate a reset token)
//     const transporter = nodemailer.createTransport({
//       service: 'gmail',
//       auth: { user: process.env.EMAIL, pass: process.env.PASSWORD },
//     });

//     const mailOptions = {
//       from: process.env.EMAIL,
//       to: email,
//       subject: 'Account Recovery',
//       text: 'Click the link to recover your account.',
//     };

//     await transporter.sendMail(mailOptions);
//     res.json({ message: 'Recovery email sent' });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to send recovery email' });
//   }
// };


// Recover Account
exports.recoverAccount = async (req, res) => {
    const { email } = req.body;
    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: 'User not found' });
  
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 3600000; // 1-hour expiry
      await user.save();
  
      const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
      await sendMail(email, 'Password Reset', `Click here to reset your password: ${resetLink}`);
      res.json({ message: 'Recovery email sent' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to send recovery email' });
    }
  };
  
  // Reset Password (New Function)
  exports.resetPassword = async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;
    try {
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });
      if (!user) return res.status(400).send('Invalid or expired reset token');
  
      user.password = await bcrypt.hash(newPassword, 10);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
  
      res.status(200).send('Password has been reset');
    } catch (error) {
      res.status(500).send('Error resetting password');
    }
  };