const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate, schemas } = require('../middlewares/validation');

router.post('/login', validate(schemas.login), authController.login);
router.post('/refresh', authController.refresh);

module.exports = router;
