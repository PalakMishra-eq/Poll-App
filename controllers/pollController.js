const Poll = require('../models/poll');
const Vote = require('../models/vote');
const User = require('../models/User');
const mongoose= require('mongoose');
const {sendMail} = require('../utils/mailer');

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
  

      // Calculate results for each choice
    let pollResults = poll.choices.map((choice) => {
      // Get user IDs who voted for this choice
      const users = votes
        .filter((vote) => vote.choiceIds.includes(choice._id.toString()))
        .map((vote) => vote.userId);

      // Calculate percentage of votes for this choice
      const voteCount = users.length;
      const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

      return {
        choiceText: choice.text,
        voteCount,
        percentage ,//`${percentage}%`
        users, // List of user IDs
      };
    });

    console.log('Poll results before sorting:', pollResults);

    //try {
      pollResults = pollResults.sort((a, b) => b.percentage - a.percentage);
   

    console.log('Poll results after sorting:', pollResults);
    
    
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



exports.reportPoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const userId = req.user.id; // User ID from the auth token

    // Find the poll
    const poll = await Poll.findById(pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Check if the user has already reported this poll
    if (poll.reportedBy.includes(userId)) {
      return res.status(403).json({ error: 'You have already reported this poll' });
    }

    // Increment the report count and add the user to the reportedBy array
    poll.reports += 1;
    poll.reportedBy.push(userId);

    // If the poll is reported 2 times, mark it as expired
    if (poll.reports >= 2) {
      poll.active = false; // Mark the poll as inactive
      poll.expirationDate = new Date(); // Optionally, set expiration date to now
      // Fetch the admin's email from the User model
    const admin = await User.findById(poll.createdBy);
    console.log("admin", admin);
    if (admin && admin.email) {
      // Send email to the admin
      const subject = `Poll Locked: ${poll.title}`;
      const text = `Dear ${admin.username},\n\n` +
                   `Your poll "${poll.title}" has been reported and locked due to multiple reports.\n` +
                   `Please review the poll to address any concerns.\n\n` +
                   `Regards,\nPoll App Team`;

      await sendMail(admin.email, subject, text);
    }

    }


    
    // Save the updated poll
    await poll.save();

    res.status(200).json({
      message: poll.reports >= 2 ? 'Poll has been disabled due to reports' : 'Poll reported successfully',
      poll,
    });
  } catch (error) {
    console.error('Error reporting poll:', error);
    res.status(500).json({ error: 'Failed to report poll' });
  }
};



exports.notifyUsersAboutPolls = async () => {
  try {
    const currentDate = new Date();
    // const oneDayFromNow = new Date();
    // const twoDaysFromNow = new Date();
    const threeDaysFromNow = new Date();
    // oneDayFromNow.setDate(currentDate.getDate() + 1);
    // twoDaysFromNow.setDate(currentDate.getDate() + 2);
    threeDaysFromNow.setDate(currentDate.getDate() + 3);

    console.log('Current date:', currentDate);
    console.log('Three days from now:', threeDaysFromNow);

    const allPolls = await Poll.find({});
console.log('All polls in database:', JSON.stringify(allPolls, null, 2));


    // Query for polls that are active and about to expire or upcoming
    const pollsToNotify = await Poll.find({
      $or: [
        {
          isActive: true,
          expirationDate: { $gte: currentDate, $lte: threeDaysFromNow }, // Active and about to expire
        },
        {
          isActive: false,
          startDate: { $gte: currentDate, $lte: threeDaysFromNow }, // Upcoming polls
        },
      ],
    });

    if (pollsToNotify.length === 0) {
      console.log('No polls to notify users about.');
      return;
    }

    console.log('Matching polls:', pollsToNotify);
    console.log('Matching polls:', JSON.stringify(pollsToNotify, null, 2));


    // Fetch all registered users' emails
    const users = await User.find({}, 'email');
    //const users = await User.find({}, 'email');
console.log('Registered users:', JSON.stringify(users, null, 2));

    const emailList = users.map((user) => user.email);

    console.log('Registered users:', emailList);


    if (emailList.length === 0) {
      console.log('No registered users to notify.');
      return;
    }

    // Construct email content
    const pollDetails = pollsToNotify.map((poll) => {
      const status = poll.active ? 'Active (about to expire)' : 'Upcoming';
      return `Title: ${poll.title}, Status: ${status}, Date: ${poll.active ? poll.expirationDate.toISOString() : poll.startDate.toISOString()}`;
    });

    const emailContent = `
      <h2>Poll Notifications</h2>
      <p>Here are the polls within the 3-day range:</p>
      <ul>${pollDetails.map((detail) => `<li>${detail}</li>`).join('')}</ul>
    `;
    try{
    // Send email
    await sendMail(
      emailList,
      'Poll Notifications',
      emailContent
    );
    // try{
    // await sendMail(
    //   'palakmishra170101@gmail.com',
    //   'Poll Notifications',
    //   '<p>This is a test email</p>'
    // );

    console.log('Email payload:', { to, subject, text });


    console.log('Poll notifications sent successfully.');
  } catch(error){
    console.log('error sending email', error.message);
  }
  } catch (error) {
    console.error('Error in notifying users about polls:', error.message);
  }
};
