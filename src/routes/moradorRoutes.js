const express = require('express');
const router = express.Router();
const moradorController = require('../controllers/moradorController');
const { authenticate, authorize } = require('../middlewares/auth');
const { validate, schemas } = require('../middlewares/validation');
const pagination = require('../middlewares/pagination');

router.get('/', authenticate, pagination, moradorController.listar);
router.get('/:id', authenticate, moradorController.buscarPorId);
router.post('/', authenticate, authorize('ADMIN'), validate(schemas.morador), moradorController.criar);
router.put('/:id', authenticate, authorize('ADMIN'), moradorController.atualizar);
router.delete('/:id', authenticate, authorize('ADMIN'), moradorController.deletar);

module.exports = router;
