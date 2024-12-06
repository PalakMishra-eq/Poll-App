const voteTracker = new Map(); // Key: IP address, Value: Array of timestamps
const { voteRateLimit } = require('../config'); // Configuration for rate limits

const rateLimiter = (req, res, next) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const currentTime = Date.now();

    // Retrieve the IP's vote history
    const voteHistory = voteTracker.get(ip) || [];

    // Filter out timestamps outside the time window
    const recentVotes = voteHistory.filter(
      (timestamp) => currentTime - timestamp <= voteRateLimit.timeWindow
    );

    // Check if the vote limit is exceeded
    if (recentVotes.length >= voteRateLimit.maxVotes) {
      return res
        .status(429)
        .json({ error: 'You have exceeded the voting limit. Try again later.' });
    }

    // Update the vote history for the IP
    recentVotes.push(currentTime);
    voteTracker.set(ip, recentVotes);

    next(); // Proceed to the next middleware/controller
  } catch (error) {
    console.error('Error in rate limiter middleware:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = rateLimiter;
