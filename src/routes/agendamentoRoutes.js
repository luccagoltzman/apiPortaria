const express = require('express');
const router = express.Router();
const agendamentoController = require('../controllers/agendamentoController');
const { authenticate, authorize } = require('../middlewares/auth');
const { validate, schemas } = require('../middlewares/validation');
const pagination = require('../middlewares/pagination');

router.get('/', authenticate, pagination, agendamentoController.listar);
router.get('/:id', authenticate, agendamentoController.buscarPorId);
router.post('/', authenticate, validate(schemas.agendamento), agendamentoController.criar);
router.put('/:id', authenticate, agendamentoController.atualizar);
router.delete('/:id', authenticate, authorize('ADMIN', 'PORTEIRO'), agendamentoController.deletar);
router.post('/:id/gerar-qrcode', authenticate, agendamentoController.gerarQRCode);

module.exports = router;
