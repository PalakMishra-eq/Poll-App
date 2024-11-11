const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middlewares/authMiddleware');

router.delete('/deletePoll', auth, adminOnly, (req, res) => {
  // Poll deletion logic here
  res.json({ message: 'Poll deleted' });
});

router.post('/vote', auth, (req, res) => {
  // Voting logic here
  res.json({ message: 'Vote registered' });
});

module.exports = router;
