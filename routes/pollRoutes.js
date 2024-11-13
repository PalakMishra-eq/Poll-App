const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middlewares/authMiddleware');
const { checkPollStatus } = require('../middlewares/pollMiddleware');
const { createPoll, voteOnPoll, deletePoll } = require('../controllers/pollController');

// Route for admins to create a poll
router.post('/create', auth, adminOnly, createPoll);

// Route to vote on a poll (restricted to active polls)
router.post('/:pollId/vote', auth, checkPollStatus, voteOnPoll);

// Route for admins to delete a specific poll
router.delete('/:pollId/delete', auth, adminOnly, deletePoll);

module.exports = router;
