// routes/recoverAccount.js
const express = require('express');
const { sendMail } = require('../utils/mailer');

const router = express.Router();

router.post('/recover', async (req, res) => {
  const { email } = req.body;
  
  try {
    // Generate a recovery token or link here, e.g., using JWT or a unique token in the database.
    const recoveryToken = 'your-recovery-token-or-link';

    // Send the recovery email
    await sendMail(
      email,
      'Account Recovery',
      `Please use the following link to recover your account: ${recoveryToken}`
    );

    res.status(200).send('Recovery email sent successfully');
  } catch (error) {
    res.status(500).send('Failed to send recovery email');
  }
});

module.exports = router;
