const express = require('express');
const router = express.Router();
const visitanteController = require('../controllers/visitanteController');
const { authenticate, authorize } = require('../middlewares/auth');
const { validate, schemas } = require('../middlewares/validation');
const upload = require('../config/upload');
const pagination = require('../middlewares/pagination');

router.get('/', authenticate, pagination, visitanteController.listar);
router.get('/:id', authenticate, visitanteController.buscarPorId);
router.get('/buscar/:cpf', authenticate, visitanteController.buscarPorCPF);
router.post('/', authenticate, authorize('ADMIN', 'PORTEIRO'), upload.single('foto'), validate(schemas.visitante), visitanteController.criar);
router.put('/:id', authenticate, authorize('ADMIN', 'PORTEIRO'), visitanteController.atualizar);
router.delete('/:id', authenticate, authorize('ADMIN'), visitanteController.deletar);

module.exports = router;
