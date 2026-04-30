const express = require('express');
const router = express.Router();
const { login, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post('/login', validate(['email', 'password']), login);
router.get('/me', authenticate, me);

module.exports = router;
