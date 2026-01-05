const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const visitanteRoutes = require('./visitanteRoutes');
const registroRoutes = require('./registroRoutes');
const blacklistRoutes = require('./blacklistRoutes');
const uploadRoutes = require('./uploadRoutes');
const ocrRoutes = require('./ocrRoutes');

router.use('/auth', authRoutes);
router.use('/visitantes', visitanteRoutes);
router.use('/registros', registroRoutes);
router.use('/blacklist', blacklistRoutes);
router.use('/upload', uploadRoutes);
router.use('/ocr', ocrRoutes);

module.exports = router;
