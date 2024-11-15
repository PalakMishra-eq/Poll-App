// models/Vote.js
const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pollId: { type: mongoose.Schema.Types.ObjectId, ref: 'poll', required: true },
  choiceIds: [{ type: mongoose.Schema.Types.ObjectId, required: true }],
}, { timestamps: true });

voteSchema.index({ userId: 1, pollId: 1 }, { unique: true }); // Ensure one vote per user per poll

module.exports = mongoose.model('Vote', voteSchema);
