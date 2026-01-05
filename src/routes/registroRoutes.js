const express = require('express');
const router = express.Router();
const registroController = require('../controllers/registroController');
const { authenticate, authorize } = require('../middlewares/auth');
const upload = require('../config/upload');
const pagination = require('../middlewares/pagination');
const multer = require('multer');

router.get('/', authenticate, pagination, registroController.listar);
router.get('/estatisticas', authenticate, registroController.estatisticas);
router.get('/:id', authenticate, registroController.buscarPorId);

// Middleware para tratar erros do multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'Arquivo excede o tamanho máximo permitido (5MB)',
        },
      });
    }
    return res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: err.message,
      },
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: err.message || 'Erro ao processar upload',
      },
    });
  }
  next();
};

// Aceitar arquivo com diferentes nomes de campo
router.post('/entrada', 
  authenticate, 
  authorize('ADMIN', 'PORTEIRO'), 
  (req, res, next) => {
    // Tentar diferentes nomes de campo
    const uploadMiddleware = upload.fields([
      { name: 'foto', maxCount: 1 },
      { name: 'imagem', maxCount: 1 },
      { name: 'file', maxCount: 1 },
    ]);
    
    uploadMiddleware(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      
      // Normalizar para req.file (multer.single)
      if (req.files) {
        req.file = req.files.foto?.[0] || req.files.imagem?.[0] || req.files.file?.[0];
      }
      
      next();
    });
  },
  registroController.registrarEntrada
);
router.post('/saida', authenticate, authorize('ADMIN', 'PORTEIRO'), registroController.registrarSaida);

module.exports = router;
