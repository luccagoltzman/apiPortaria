const express = require('express');
const router = express.Router();
const blacklistController = require('../controllers/blacklistController');
const { authenticate, authorize } = require('../middlewares/auth');
const { validate, schemas } = require('../middlewares/validation');

router.get('/', authenticate, authorize('ADMIN'), blacklistController.listar);
router.post('/', authenticate, authorize('ADMIN'), validate(schemas.blacklist), blacklistController.adicionar);
router.delete('/:id', authenticate, authorize('ADMIN'), blacklistController.remover);
router.get('/verificar/:cpf', authenticate, authorize('ADMIN', 'PORTEIRO'), blacklistController.verificar);

module.exports = router;
