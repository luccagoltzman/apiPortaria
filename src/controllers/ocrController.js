/**
 * POST /api/ocr/processar
 * Endpoint básico de OCR
 * Nota: Para produção, integre com serviço real de OCR (Google Cloud Vision, AWS Textract, etc)
 */
async function processarOCR(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FILE',
          message: 'Imagem do documento é obrigatória',
        },
      });
    }

    // TODO: Integrar com serviço real de OCR
    // Por enquanto, retornar estrutura básica
    // Exemplos de serviços:
    // - Google Cloud Vision API
    // - AWS Textract
    // - Tesseract.js (open source, mas menos preciso)

    res.json({
      texto: 'Texto extraído do documento (implementar integração com OCR)',
      dados: {
        nome: 'Nome extraído do documento',
        cpf: 'CPF extraído do documento',
        dataNascimento: 'DD/MM/YYYY',
      },
      confianca: 0,
      message: 'OCR não implementado. Integre com serviço de OCR (Google Cloud Vision, AWS Textract, etc)',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  processarOCR,
};
