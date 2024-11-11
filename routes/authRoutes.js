const express = require('express');
const router = express.Router();
const { signUp, login, recoverAccount, resetPassword } = require('../controllers/authController');

router.post('/signup', signUp);
router.post('/login', login);
router.post('/recover', recoverAccount);
router.post('/reset-password/:token', resetPassword);

module.exports = router;
