const express = require('express');
const router = express.Router();
const prestadorController = require('../controllers/prestadorController');
const { authenticate, authorize } = require('../middlewares/auth');
const { validate, schemas } = require('../middlewares/validation');

router.get('/', authenticate, prestadorController.listar);
router.post('/', authenticate, authorize('ADMIN'), validate(schemas.prestador), prestadorController.criar);

module.exports = router;
