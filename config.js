// db.js 
module.exports = {
    dbURI: 'mongodb://localhost:27017/pollApp',
    jwtSecret: 'yourSecretKey',
    voteRateLimit: {
      timeWindow: 60 * 1000, // 1 minute in milliseconds
      maxVotes: 1, // Max 1 vote per minute per IP
    },
  };