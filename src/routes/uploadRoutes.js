const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { authenticate, authorize } = require('../middlewares/auth');
const upload = require('../config/upload');

router.post('/foto', authenticate, authorize('ADMIN', 'PORTEIRO'), upload.single('foto'), uploadController.uploadFoto);

module.exports = router;
