const mongoose = require('mongoose');

const pollSchema = new mongoose.Schema({
  title: { type: String, required: true },
  question: { type: String, required: true },
  choices: [
    {
      text: { type: String, required: true },
      votes: { type: Number, default: 0 },
    },
  ],
  pollType: { type: String, enum: ['single-choice', 'multiple-choice'], required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, default: Date.now },      // When the poll should start
  expirationDate: { type: Date, required: true },    // When the poll expires
  isActive: { type: Boolean, default: true },        // To check if poll is active
  reports: { type: Number, default: 0 }, // Number of reports
  reportedBy: [{ type: String }], // Array of user IDs who reported
});

pollSchema.methods.isExpired = function() {
  return new Date() > this.expirationDate;
};
// pollSchema.virtual('status').get(function () {
//   const now = new Date();
//   if (this.expirationDate < now) return 'expired';
//   if (this.active) return 'active';
//   return 'upcoming';
// });

module.exports = mongoose.model('Poll', pollSchema);
