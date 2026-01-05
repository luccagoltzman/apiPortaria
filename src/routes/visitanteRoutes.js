const express = require('express');
const router = express.Router();
const visitanteController = require('../controllers/visitanteController');
const { authenticate, authorize } = require('../middlewares/auth');
const upload = require('../config/upload');
const pagination = require('../middlewares/pagination');

router.get('/', authenticate, pagination, visitanteController.listar);
router.get('/cpf/:cpf', authenticate, visitanteController.buscarPorCPF);
router.get('/:id', authenticate, visitanteController.buscarPorId);
router.post('/', authenticate, authorize('ADMIN', 'PORTEIRO'), upload.single('foto'), visitanteController.criar);
router.put('/:id', authenticate, authorize('ADMIN', 'PORTEIRO'), upload.single('foto'), visitanteController.atualizar);
router.put('/:id/foto', authenticate, authorize('ADMIN', 'PORTEIRO'), upload.single('foto'), visitanteController.atualizarFoto);
router.delete('/:id', authenticate, authorize('ADMIN'), visitanteController.deletar);

module.exports = router;
