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


// // Get polls voted by the user
// exports.getUserVotes = async (req, res) => {
//   try {
//     const userId = req.user.id; // Authenticated user's ID

//     // Find all votes by the user (no ObjectId conversion needed)
//     const userVotes = await Vote.find({ userId });
//     console.log('uid', userId );
//     //console.log('vid', voterId );

//     console.log('uservotes', userVotes);

//     if (userVotes.length === 0) {
//       return res.status(404).json({ message: 'No votes found for this user' });
//     }

//     // Fetch the poll details for each vote
//     const pollsWithChoices = await Promise.all(
//       userVotes.map(async (vote) => {
//         const poll = await Poll.findById(vote.pollId); // Query by pollId as string

//         if (!poll) {
//           return null; // Handle edge case if a poll is deleted
//         }

//         return {
//           pollTitle: poll.title,
//           pollDescription: poll.description,
//           votedChoice: poll.choices.filter((choice) =>
//             vote.choiceIds.includes(choice._id.toString())
//           ),
//         };
//       })
//     );

//     // Filter out null values in case of deleted polls
//     const filteredPolls = pollsWithChoices.filter((poll) => poll !== null);
//     console.log('also wont work', filteredPolls );

//     res.status(200).json({
//       message: 'User votes retrieved successfully',
//       polls: filteredPolls,
//     });
//   } catch (error) {
//     console.error('Error fetching user votes:', error);
//     res.status(500).json({ error: 'Failed to retrieve user votes' });
//   }
// };

// Get polls voted by the user
exports.getUserVotes = async (req, res) => {
  try {
    const userId = req.user.id; // Authenticated user's ID

    // Find all votes by the user
    const userVotes = await Vote.find({ userId });
    console.log('User ID:', userId);
    console.log('User Votes:', userVotes);

    if (userVotes.length === 0) {
      return res.status(404).json({ message: 'No votes found for this user' });
    }

    // Fetch poll details and calculate metrics
    const pollsWithChoices = await Promise.all(
      userVotes.map(async (vote) => {
        const poll = await Poll.findById(vote.pollId); // Query by pollId

        if (!poll) {
          return null; // Handle edge case if a poll is deleted
        }

        // Calculate total votes for the poll
        const totalVotes = poll.choices.reduce((sum, choice) => sum + choice.votes, 0);

        // Find the choice with the highest percentage votes
        let highestChoice = null;
        let highestPercentage = 0;

        poll.choices.forEach((choice) => {
          const percentage =
            totalVotes > 0 ? ((choice.votes / totalVotes) * 100).toFixed(2) : 0;

          if (percentage > highestPercentage) {
            highestPercentage = percentage;
            highestChoice = {
              choiceText: choice.text,
              percentage: `${percentage}%`,
            };
          }
        });

        // Find the user's voted choice(s)
        const votedChoice = poll.choices
          .filter((choice) => vote.choiceIds.includes(choice._id.toString()))
          .map((choice) => ({
            choiceText: choice.text,
            percentage: totalVotes > 0 ? ((choice.votes / totalVotes) * 100).toFixed(2) : '0.00%',
          }));

        return {
          pollTitle: poll.title,
          pollDescription: poll.description,
          userVotedChoice: votedChoice,
          highestVotedChoice: highestChoice,
        };
      })
    );

    // Filter out null values in case of deleted polls
    const filteredPolls = pollsWithChoices.filter((poll) => poll !== null);
    console.log('Filtered Polls:', filteredPolls);

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

    // Define date ranges
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(currentDate.getDate() + 3);

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(currentDate.getDate() + 7);

    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(currentDate.getMonth() + 1);

    const twoMonthsFromNow = new Date();
    twoMonthsFromNow.setMonth(currentDate.getMonth() + 2);

    // Fetch polls for each range
    const pollsWithin3Days = await Poll.find({
      $or: [
        { expirationDate: { $gte: currentDate, $lte: threeDaysFromNow } },
        { startDate: { $gte: currentDate, $lte: threeDaysFromNow } },
      ],
    });

    const pollsWithin3to7Days = await Poll.find({
      $or: [
        { expirationDate: { $gte: threeDaysFromNow, $lte: sevenDaysFromNow } },
        { startDate: { $gte: threeDaysFromNow, $lte: sevenDaysFromNow } },
      ],
    });

    const pollsWithin1Month = await Poll.find({
      $or: [
        { expirationDate: { $gte: sevenDaysFromNow, $lte: oneMonthFromNow } },
        { startDate: { $gte: sevenDaysFromNow, $lte: oneMonthFromNow } },
      ],
    });

    const pollsWithin2Months = await Poll.find({
      $or: [
        { expirationDate: { $gte: oneMonthFromNow, $lte: twoMonthsFromNow } },
        { startDate: { $gte: oneMonthFromNow, $lte: twoMonthsFromNow } },
      ],
    });

    // Log results for debugging
    console.log('Polls within 3 days:', pollsWithin3Days);
    console.log('Polls within 3-7 days:', pollsWithin3to7Days);
    console.log('Polls within 1 month:', pollsWithin1Month);
    console.log('Polls within 2 months:', pollsWithin2Months);

    // Fetch all registered users' emails
    const users = await User.find({}, 'email');
    const emailList = users.map((user) => user.email);

    if (emailList.length === 0) {
      console.log('No registered users to notify.');
      return;
    }


    const generateTable = (polls) => {
      if (polls.length === 0) {
        return `<tr><td colspan="3">No polls found</td></tr>`;
      }
      return polls
        .map(
          (poll) => `
            <tr>
              <td>${poll.title}</td>
              <td>${poll.isActive ? 'Active' : 'Upcoming'}</td>
              <td>${poll.isActive ? poll.expirationDate.toISOString() : poll.startDate.toISOString()}</td>
            </tr>
          `
        )
        .join('');
    };
    
    const emailContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        h2 { color: #333; }
        h3 { color: #555; margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f4f4f4; color: #333; }
        pre { background: #f9f9f9; padding: 10px; border-radius: 5px; font-family: monospace; }
        .section { margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <h2>Poll Notifications</h2>
      <p>Here are the polls categorized by their timelines:</p>
      
      <div class="section">
        <h3>Polls within the next 3 days:</h3>
        <table>
          <thead>
            <tr><th>Title</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>${generateTable(pollsWithin3Days)}</tbody>
        </table>
      </div>
    
      <div class="section">
        <h3>Polls starting in 3-7 days:</h3>
        <table>
          <thead>
            <tr><th>Title</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>${generateTable(pollsWithin3to7Days)}</tbody>
        </table>
      </div>
    
      <div class="section">
        <h3>Polls starting within 1 month:</h3>
        <table>
          <thead>
            <tr><th>Title</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>${generateTable(pollsWithin1Month)}</tbody>
        </table>
      </div>
    </body>
    </html>
    `;
    

    // Send email to all users
    await sendMail(emailList, 'Poll Notifications', emailContent);

    console.log('Poll notifications sent successfully.');
  } catch (error) {
    console.error('Error in notifying users about polls:', error.message);
  }
};




// exports.getPollDetails = async (req, res) => {
//   try {
//     const { pollId } = req.params;

//     // Validate ObjectId format
//     if (!pollId || !pollId.match(/^[0-9a-fA-F]{24}$/)) {
//       return res.status(400).json({ error: 'Invalid poll ID format' });
//     }

//     // Fetch poll by ID
//     const poll = await Poll.findById(pollId);

//     if (!poll) {
//       return res.status(404).json({ error: 'Poll not found' });
//     }

//     // Format the response
//     const pollDetails = {
//       _id: poll._id.toString(),
//       title: poll.title,
//       question: poll.question,
//       pollType: poll.pollType,
//       expirationDate: poll.expirationDate,
//       startDate: poll.startDate,
//       createdBy: poll.createdBy, // Include createdBy if needed
//       choices: poll.choices.map((choice) => ({
//         _id: choice._id.toString(), // Ensure ObjectId is a string
//         text: choice.text,
//         votes: choice.votes, // Include votes if needed
//       })),
//     };

//     res.status(200).json(pollDetails);
//   } catch (error) {
//     console.error('Error fetching poll details:', error.message);
//     res.status(500).json({ error: 'Failed to fetch poll details' });
//   }
// };


