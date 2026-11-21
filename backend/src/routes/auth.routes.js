const express = require('express');
const validate = require('../middleware/validate');
const requireAuth = require('../middleware/auth');
const { registerSchema, loginSchema } = require('../validators/auth.validators');
const controller = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', validate({ body: registerSchema }), controller.register);
router.post('/login', validate({ body: loginSchema }), controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', requireAuth, controller.logout);
router.get('/me', requireAuth, controller.getMe);

module.exports = router;
