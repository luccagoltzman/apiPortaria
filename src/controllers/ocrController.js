const ocrService = require('../services/ocrService');

/**
 * POST /api/ocr/processar
 * Processa imagem de documento e extrai dados usando OCR
 */
async function processarOCR(req, res, next) {
  try {
    // Validar arquivo
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FILE',
          message: 'Imagem do documento é obrigatória',
        },
      });
    }

    try {
      ocrService.validarImagem(req.file);
    } catch (validationError) {
      if (validationError.message.includes('tamanho')) {
        return res.status(413).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: validationError.message,
          },
        });
      }
      if (validationError.message.includes('Tipo')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_IMAGE',
            message: validationError.message,
          },
        });
      }
      throw validationError;
    }

    // Processar OCR
    let resultadoOCR;
    try {
      resultadoOCR = await ocrService.processarImagemOCR(req.file.buffer);
    } catch (ocrError) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'OCR_PROCESSING_ERROR',
          message: 'Erro ao processar documento com OCR',
        },
      });
    }

    // Extrair dados estruturados
    const dados = ocrService.extrairDados(resultadoOCR.texto);

    // Calcular confiança geral baseada na extração
    let confianca = resultadoOCR.confianca;
    const camposEncontrados = [dados.nome, dados.cpf, dados.dataNascimento].filter(Boolean).length;
    
    // Ajustar confiança baseado em quantos campos foram encontrados
    if (camposEncontrados === 3) {
      confianca = Math.min(confianca + 0.1, 1.0); // Bonus se todos os campos foram encontrados
    } else if (camposEncontrados === 0) {
      confianca = Math.max(confianca - 0.3, 0.0); // Penalidade se nenhum campo foi encontrado
    }

    // Resposta de sucesso
    res.json({
      success: true,
      data: {
        texto: resultadoOCR.texto,
        dados: {
          nome: dados.nome,
          cpf: dados.cpf,
          dataNascimento: dados.dataNascimento,
        },
        confianca: Math.round(confianca * 100) / 100, // Arredondar para 2 casas decimais
      },
      message: 'Documento processado com sucesso',
    });
  } catch (error) {
    console.error('Erro no processamento OCR:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'OCR_PROCESSING_ERROR',
        message: 'Erro ao processar documento com OCR',
      },
    });
  }
}

module.exports = {
  processarOCR,
};
