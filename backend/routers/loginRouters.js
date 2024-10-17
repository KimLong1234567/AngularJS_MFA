const express = require('express');
const router = express.Router();
const controller = require('../controller/loginController');

router.post('/login', controller.login);
router.get('/', controller.getAllUsers);
router.post('/mfa/verify', controller.verifyMFA); // New route for MFA verification

module.exports = router;
