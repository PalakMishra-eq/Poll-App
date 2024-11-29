// models/Vote.js
const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  userId: { type: String, ref: 'User', required: true },
  pollId: { type: String, ref: 'poll', required: true },
  choiceIds: [{ type: String, required: true }],
}, { timestamps: true });

voteSchema.index({ userId: 1, pollId: 1 }, { unique: true }); // Ensure one vote per user per poll

module.exports = mongoose.model('Vote', voteSchema);
