const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Voter'], default: 'Voter' },
  securityQuestion: { type: String, required: true }, // e.g., "What was the name of your first pet?"
  securityAnswer: { type: String, required: true },  // Store hashed security answer for additional security
  resetPasswordToken: {type: String} ,
  resetPasswordExpires: {type: Date},
  profilePicture: { type: String, default: null },
  bio: {type: String, default: ''},
  interests: {type: [String], default: []},
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
