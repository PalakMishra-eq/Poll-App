const Poll = require('../models/poll');
const Vote = require('../models/vote');
const User = require('../models/User');
const mongoose= require('mongoose');

exports.createPoll = async (req, res) => {
  try {
    const { question, choices, pollType, startDate, expirationDate } = req.body;

    if (new Date(startDate) >= new Date(expirationDate)) {
        return res.status(400).json({ error: 'Start date must be before expiration date.' });
      }

    // Validate required fields
    if (!question || !choices || !pollType || !expirationDate) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Only admin can create polls
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ error: 'Access restricted to Admins' });
    }

    // Validate poll type and choices
    if (!['single-choice', 'multiple-choice'].includes(pollType)) {
      return res.status(400).json({ error: 'Invalid poll type' });
    }
    if (!Array.isArray(choices) || choices.length < 2) {
      return res.status(400).json({ error: 'Poll must have at least two choices' });
    }

    // Format choices
    const formattedChoices = choices.map((choice) => ({ text: choice }));

    // Create poll
    const poll = new Poll({
      question,
      choices: formattedChoices,
      pollType,
      createdBy: req.user.id,
      startDate: startDate || Date.now() ,
      expirationDate,
    });

    await poll.save();
    res.status(201).json({ message: 'Poll created successfully', poll });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create poll' });
  }
};


// Example deletePoll function
exports.deletePoll = async (req, res) => {
    try {
      const pollId = req.params.pollId;
      const poll = await Poll.findByIdAndDelete(pollId);
      
      if (!poll) {
        return res.status(404).json({ error: 'Poll not found' });
      }
      
      res.json({ message: 'Poll deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete poll' });
    }
  };
  


exports.voteOnPoll = async (req, res) => {
    try {
      const poll = req.poll; // Retrieved from checkPollStatus middleware
      const { choiceIds } = req.body;
      const userId = req.user.id; // User ID from auth token new
  
      // Check if the user has already voted on this poll
    const existingVote = await Vote.findOne({ userId, pollId: poll._id });
    if (existingVote) {
      return res.status(403).json({ error: 'You have already voted on this poll' });
    }

      // Check for single or multiple-choice constraints
      if (poll.pollType === 'single-choice' && choiceIds.length > 1) {
        return res.status(400).json({ error: 'Only one choice allowed in single-choice polls' });
      }
  
      // Update votes for each choice in multiple-choice polls
      poll.choices.forEach((choice) => {
        if (choiceIds.includes(choice._id.toString())) {
          choice.votes += 1;
        }
      });
  
      await poll.save();

      // Record this user's vote in the Vote model
    const newVote = new Vote({
        userId,
        pollId: poll._id,
        choiceIds,
      });
      await newVote.save();

      res.json({ message: 'Vote cast successfully', poll });
    } catch (error) {
      res.status(500).json({ error: 'Failed to vote on poll' });
    }
  };
  

  // Controller for poll-based insights
exports.getPollResults = async (req, res) => {
    try {
      const { pollId } = req.params;
  
      // Retrieve the poll by ID
      const poll = await Poll.findById(pollId);
      if (!poll) {
        return res.status(404).json({ error: 'Poll not found' });
      }
  
      // Fetch all votes for this poll
      const votes = await Vote.find({ pollId, voterId: req.user.id });
  
      // Poll-based insights
      const pollResults = poll.choices.map((choice) => {
        const voteCount = votes.filter((vote) => vote.choiceIds.includes(choice._id)).length;
        return {
          choice: choice.text,
          votes: voteCount,
        };
      });
  
      // Voter-based insights
      const voterInsights = votes.map((vote) => ({
        voter: {
          name: vote.userId.name,
          email: vote.userId.email,
        },
        choices: vote.choiceIds, // This contains choice IDs; can be populated if needed
      }));
  
      const insights = {
        totalVotes: votes.length,
        pollResults,
        voterInsights,
        pollType: poll.pollType,
        expirationDate: poll.expirationDate,
        active: poll.active,
      };
  
      res.json(insights);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve poll results' });
    }
  };

  exports.getUserVote = async (req, res) => {
    try {
      const { pollId } = req.params;
      const userId= req.user.id;
  
      // Check if poll exists
      const poll = await Poll.findById(pollId);
      if (!poll) {
        return res.status(404).json({ message: 'Poll not found' });
      }
  
      // Ensure `pollId` and `voterId` are passed as ObjectId
    const userVotes = await Vote.find({
      pollId: new mongoose.Types.ObjectId(pollId) ,
      voterId: new mongoose.Types.ObjectId(userId),
    });
  
    console.log(pollId);
    console.log(voterId);
    
    console.log(userVotes);

      if (userVotes.length === 0) {
        return res.status(404).json({ message: 'No votes found for this poll by the current user' });
      }
  
      // Map user votes to choices
      const userVoteDetails = userVotes.map((vote) => {
        const choice = poll.choices.find((choice) => choice._id.toString() === vote.choiceId.toString());
        return {
          choice: choice ? choice.text : 'Choice no longer exists',
          choiceId: vote.choiceId,
        };
      });
  
      res.json({
        poll: poll.title,
        votes: userVoteDetails,
      });
    } catch (error) {
      console.error('Error in getUserVote:', error.message);
      res.status(500).json({ message: 'Failed to fetch user votes', error: error.message });
    }
  };