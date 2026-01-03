const express = require('express');
const router = express.Router();
const registroController = require('../controllers/registroController');
const { authenticate, authorize } = require('../middlewares/auth');
const { validate, schemas } = require('../middlewares/validation');
const upload = require('../config/upload');
const pagination = require('../middlewares/pagination');

router.get('/', authenticate, pagination, registroController.listar);
router.get('/:id', authenticate, registroController.buscarPorId);
router.get('/estatisticas', authenticate, registroController.estatisticas);
router.post('/entrada', authenticate, authorize('ADMIN', 'PORTEIRO'), upload.single('foto'), validate(schemas.registroEntrada), registroController.registrarEntrada);
router.put('/:id/saida', authenticate, authorize('ADMIN', 'PORTEIRO'), registroController.registrarSaida);

module.exports = router;
