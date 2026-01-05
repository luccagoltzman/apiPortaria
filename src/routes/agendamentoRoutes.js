const express = require('express');
const router = express.Router();
const agendamentoController = require('../controllers/agendamentoController');
const { authenticate, authorize } = require('../middlewares/auth');
const pagination = require('../middlewares/pagination');

router.get('/', authenticate, pagination, agendamentoController.listar);
router.post('/', authenticate, authorize('ADMIN', 'PORTEIRO'), agendamentoController.criar);

module.exports = router;
