const Poll = require('../models/poll');
const Vote = require('../models/vote');
const User = require('../models/User');
const mongoose= require('mongoose');

exports.createPoll = async (req, res) => {
  try {
    const { title, question, choices, pollType, startDate, expirationDate } = req.body;

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
      title,
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
    const existingVote = await Vote.findOne({ userId, pollId: poll._id.toString() });
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
        pollId: poll._id.toString(),
        choiceIds: choiceIds.map((id) => id.toString()),
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
      const votes = await Vote.find({pollId: pollId.toString()});

      if (votes.length === 0) {
        return res.status(404).json({ message: 'No votes found for this poll' });
      }
  
      // Calculate total votes
      const totalVotes = votes.length;
  
      // // Poll-based insights
      // const pollResults = poll.choices.map((choice) => {
      //   const voteCount = votes.filter((vote) => vote.choiceIds.includes(choice._id)).length;
      //   return {
      //     choice: choice.text,
      //     votes: voteCount,
      //   };
      // });
  
      // // Voter-based insights
      // const voterInsights = votes.map((vote) => ({
      //   voter: {
      //     name: vote.userId.name,
      //     email: vote.userId.email,
      //   },
      //   choices: vote.choiceIds, // This contains choice IDs; can be populated if needed
      // }));
  
      // const insights = {
      //   totalVotes: votes.length,
      //   pollResults,
      //   voterInsights,
      //   pollType: poll.pollType,
      //   expirationDate: poll.expirationDate,
      //   active: poll.active,
      // };

      // Calculate results for each choice
    const pollResults = poll.choices.map((choice) => {
      // Get user IDs who voted for this choice
      const users = votes
        .filter((vote) => vote.choiceIds.includes(choice._id.toString()))
        .map((vote) => vote.userId);

      // Calculate percentage of votes for this choice
      const voteCount = users.length;
      const percentage = totalVotes > 0 ? ((voteCount / totalVotes) * 100).toFixed(2) : 0;

      return {
        choiceText: choice.text,
        voteCount,
        percentage: `${percentage}%`,
        users, // List of user IDs
      };
    });
  
      //res.json(insights);
      // Construct response
    res.status(200).json({
      pollTitle: poll.title,
      pollDescription: poll.description,
      totalVotes,
      results: pollResults,
    });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve poll results' });
    }
  };

  // Controller for poll search, filter, and sort
exports.searchPolls = async (req, res) => {
  try {
    console.log('Search polls called with query:', req.query);
    const { search = '', status, sortBy = 'expirationDate', sortOrder = 'asc' } = req.query;

    const now = new Date();

    // Base query to match search term
    const query = {
      title: { $regex: search, $options: 'i' }, // Case-insensitive search
    };

    // Add status filter if specified
    if (status === 'active') {
      query.active = true;
      query.expirationDate = { $gte: now };
    } else if (status === 'expired') {
      query.expirationDate = { $lt: now };
    } else if (status === 'upcoming') {
      query.active = false;
      query.expirationDate = { $gte: now };
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Fetch polls
    const polls = await Poll.find(query).sort(sortOptions);
    console.log('Polls fetched:', polls);

    res.status(200).json(polls);
  } catch (error) {
    console.error('Error fetching polls:', error.message);
    res.status(500).json({ error: 'Failed to fetch polls' });
  }
};


// Get polls voted by the user
exports.getUserVotes = async (req, res) => {
  try {
    const userId = req.user.id; // Authenticated user's ID

    // Find all votes by the user (no ObjectId conversion needed)
    const userVotes = await Vote.find({ userId });
    console.log('uid', userId );
    //console.log('vid', voterId );

    console.log('uservotes', userVotes);

    if (userVotes.length === 0) {
      return res.status(404).json({ message: 'No votes found for this user' });
    }

    // Fetch the poll details for each vote
    const pollsWithChoices = await Promise.all(
      userVotes.map(async (vote) => {
        const poll = await Poll.findById(vote.pollId); // Query by pollId as string

        if (!poll) {
          return null; // Handle edge case if a poll is deleted
        }

        return {
          pollTitle: poll.title,
          pollDescription: poll.description,
          votedChoice: poll.choices.filter((choice) =>
            vote.choiceIds.includes(choice._id.toString())
          ),
        };
      })
    );

    // Filter out null values in case of deleted polls
    const filteredPolls = pollsWithChoices.filter((poll) => poll !== null);
    console.log('also wont work', filteredPolls );

    res.status(200).json({
      message: 'User votes retrieved successfully',
      polls: filteredPolls,
    });
  } catch (error) {
    console.error('Error fetching user votes:', error);
    res.status(500).json({ error: 'Failed to retrieve user votes' });
  }
};
