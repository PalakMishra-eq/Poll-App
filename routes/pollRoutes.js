const express = require('express');
const router = express.Router();
const { auth, roleAuthorization } = require('../middlewares/authMiddleware');
const { checkPollStatus } = require('../middlewares/pollMiddleware');
const { createPoll, voteOnPoll, deletePoll, getPollResults, searchPolls, getUserVotes, reportPoll } = require('../controllers/pollController');

// Route for admins to create a poll
router.post('/create', auth,  roleAuthorization(['Admin']), createPoll);

// Route to vote on a poll (restricted to active polls)
router.post('/:pollId/vote', auth, checkPollStatus,  roleAuthorization(['Voter']), voteOnPoll);

// Route for admins to delete a specific poll
router.delete('/:pollId/delete', auth,  roleAuthorization(['Admin']), deletePoll);

// Route to get poll-based and voter-based insights (only accessible by admins)
router.get('/:pollId/results', auth,  roleAuthorization(['Admin']), getPollResults);

// Route for users to view their own vote for a specific poll
//router.get('/:pollId/my-vote', auth, roleAuthorization(['Voter', 'Admin']), getUserVote);

// Route to report a poll
router.post('/:pollId/report', auth, roleAuthorization(['Voter']), reportPoll);

router.get('/polls', searchPolls); 

// Route to get polls voted by the user
router.get('/my-votes', auth, roleAuthorization(['Voter']), getUserVotes);

// Search and filter polls
router.get('/', searchPolls);

module.exports = router;
