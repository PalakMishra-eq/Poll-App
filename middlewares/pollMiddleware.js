const Poll = require('../models/Poll');

exports.checkPollStatus = async (req, res, next) => {
  try {
    const poll = await Poll.findById(req.params.pollId);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });

    const now = new Date();

    // Check if the poll is active based on start and expiration date
    if (poll.startDate > now) {
      return res.status(403).json({ error: 'Poll has not started yet' });
    }
    if (poll.isExpired()) {
      return res.status(403).json({ error: 'Poll has expired' });
    }

    req.poll = poll; // Attach the poll to the request for the next middleware
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error checking poll status' });
  }
};
