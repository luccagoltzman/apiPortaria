const express = require('express');
const router = express.Router();
const qrcodeController = require('../controllers/qrcodeController');
const { authenticate, authorize } = require('../middlewares/auth');

router.post('/gerar', authenticate, authorize('ADMIN', 'PORTEIRO'), qrcodeController.gerar);
router.post('/validar', authenticate, authorize('ADMIN', 'PORTEIRO'), qrcodeController.validar);

module.exports = router;
