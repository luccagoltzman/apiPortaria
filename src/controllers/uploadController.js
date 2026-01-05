const imageService = require('../services/imageService');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/upload/foto
 */
async function uploadFoto(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FILE',
          message: 'Arquivo de imagem é obrigatório',
        },
      });
    }

    const { tipo = 'visitante', entityId } = req.body;
    const id = entityId || uuidv4();

    // Processar imagem
    const resultado = await imageService.processarImagemVisitante(
      req.file.buffer,
      id,
      tipo
    );

    res.json({
      data: {
        url: resultado.path,
        path: resultado.path,
        thumbnailUrl: resultado.thumbnailPath,
        tamanho: resultado.tamanho,
        dimensoes: resultado.dimensoes,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadFoto,
};
