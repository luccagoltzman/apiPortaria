const express = require('express');
const router = express.Router();
const notificacaoController = require('../controllers/notificacaoController');
const { authenticate } = require('../middlewares/auth');

router.get('/', authenticate, notificacaoController.listar);
router.put('/:id/lida', authenticate, notificacaoController.marcarComoLida);
router.post('/enviar', authenticate, notificacaoController.enviar);

module.exports = router;
