const express = require('express');
const router = express.Router();
const ocrController = require('../controllers/ocrController');
const { authenticate, authorize } = require('../middlewares/auth');
const upload = require('../config/upload');

router.post('/processar', authenticate, authorize('ADMIN', 'PORTEIRO'), upload.single('imagem'), ocrController.processarOCR);

module.exports = router;
