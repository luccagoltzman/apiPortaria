const prisma = require('../config/database');
const { validarCPF } = require('../utils/validators');
const blacklistService = require('../services/blacklistService');
const imageService = require('../services/imageService');

/**
 * GET /api/visitantes
 */
async function listar(req, res, next) {
  try {
    const { search, status } = req.query;
    const { limit, skip } = req.pagination;

    const where = {};

    if (search) {
      where.OR = [
        { nome: { contains: search } },
        { cpf: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.visitante.findMany({
        where,
        include: {
          registros: {
            orderBy: { dataEntrada: 'desc' },
            take: 5,
          },
        },
        skip,
        take: limit,
        orderBy: { dataCadastro: 'desc' },
      }),
      prisma.visitante.count({ where }),
    ]);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/visitantes/:id
 */
async function buscarPorId(req, res, next) {
  try {
    const { id } = req.params;

    const visitante = await prisma.visitante.findUnique({
      where: { id },
      include: {
        registros: {
          orderBy: { dataEntrada: 'desc' },
        },
      },
    });

    if (!visitante) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Visitante não encontrado',
        },
      });
    }

    res.json({ success: true, data: visitante });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/visitantes/buscar/:cpf
 */
async function buscarPorCPF(req, res, next) {
  try {
    const { cpf } = req.params;
    const cpfLimpo = cpf.replace(/\D/g, '');

    if (!validarCPF(cpfLimpo)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CPF',
          message: 'CPF inválido',
        },
      });
    }

    const visitante = await prisma.visitante.findUnique({
      where: { cpf: cpfLimpo },
      include: {
        registros: {
          orderBy: { dataEntrada: 'desc' },
          take: 10,
        },
      },
    });

    res.json({ success: true, data: visitante });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/visitantes
 */
async function criar(req, res, next) {
  try {
    const { nome, cpf, dataNascimento } = req.body;

    // Validações obrigatórias
    if (!nome || !cpf) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Nome e CPF são obrigatórios',
        },
      });
    }

    const cpfLimpo = cpf.replace(/\D/g, '');

    if (!validarCPF(cpfLimpo)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CPF',
          message: 'CPF inválido',
        },
      });
    }

    // Verificar blacklist
    const { naBlacklist } = await blacklistService.verificarBlacklist(cpfLimpo);
    if (naBlacklist) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'BLACKLISTED',
          message: 'CPF está na blacklist',
        },
      });
    }

    // Verificar se visitante já existe
    const visitanteExistente = await prisma.visitante.findUnique({
      where: { cpf: cpfLimpo },
    });

    if (visitanteExistente) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'Visitante já cadastrado',
        },
      });
    }

    // Processar data de nascimento (formato DD/MM/YYYY)
    let dataNascimentoFormatada = null;
    if (dataNascimento) {
      // Converter DD/MM/YYYY para Date
      const partes = dataNascimento.split('/');
      if (partes.length === 3) {
        const dia = parseInt(partes[0], 10);
        const mes = parseInt(partes[1], 10) - 1; // Mês é 0-indexed
        const ano = parseInt(partes[2], 10);
        dataNascimentoFormatada = new Date(ano, mes, dia);
      } else {
        // Tentar parse direto se já estiver em formato ISO
        dataNascimentoFormatada = new Date(dataNascimento);
      }
    }

    // Processar foto se fornecida (opcional)
    let fotoPath = null;
    let thumbnailPath = null;
    
    if (req.file) {
      try {
        const tempId = `temp_${Date.now()}`;
        const resultado = await imageService.processarImagemVisitante(
          req.file.buffer,
          tempId,
          'visitantes'
        );
        fotoPath = resultado.path;
        thumbnailPath = resultado.thumbnailPath;
      } catch (imageError) {
        console.error('Erro ao processar imagem:', imageError);
        return res.status(500).json({
          success: false,
          error: {
            code: 'IMAGE_PROCESSING_ERROR',
            message: 'Erro ao processar foto',
          },
        });
      }
    }

    // Criar visitante
    const visitante = await prisma.visitante.create({
      data: {
        nome: nome.trim(),
        cpf: cpfLimpo,
        dataNascimento: dataNascimentoFormatada,
        foto: fotoPath,
        thumbnailUrl: thumbnailPath,
        tipo: 'VISITA',
      },
    });

    res.status(201).json({
      success: true,
      data: visitante,
      message: 'Visitante cadastrado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao criar visitante:', error);
    next(error);
  }
}

/**
 * PUT /api/visitantes/:id
 */
async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const { nome, cpf, dataNascimento } = req.body;

    const visitante = await prisma.visitante.findUnique({
      where: { id },
    });

    if (!visitante) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Visitante não encontrado',
        },
      });
    }

    const updateData = {};

    if (nome) {
      updateData.nome = nome.trim();
    }

    if (cpf) {
      const cpfLimpo = cpf.replace(/\D/g, '');
      if (!validarCPF(cpfLimpo)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CPF',
            message: 'CPF inválido',
          },
        });
      }
      updateData.cpf = cpfLimpo;
    }

    // Validar e processar data de nascimento
    if (dataNascimento) {
      let dataFormatada = null;
      
      // Tentar formato DD/MM/YYYY
      const partes = dataNascimento.split('/');
      if (partes.length === 3) {
        const dia = parseInt(partes[0], 10);
        const mes = parseInt(partes[1], 10) - 1;
        const ano = parseInt(partes[2], 10);
        dataFormatada = new Date(ano, mes, dia);
      } else {
        // Tentar formato ISO
        dataFormatada = new Date(dataNascimento);
      }
      
      // Validar se a data é válida
      if (isNaN(dataFormatada.getTime())) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Data de nascimento inválida',
          },
        });
      }
      
      updateData.dataNascimento = dataFormatada;
    }

    // Se nova foto foi enviada, processar
    if (req.file) {
      try {
        const { path: fotoPath, thumbnailPath } = await imageService.processarImagemVisitante(
          req.file.buffer,
          id,
          'visitantes'
        );
        updateData.foto = fotoPath;
        updateData.thumbnailUrl = thumbnailPath;
      } catch (imageError) {
        console.error('Erro ao processar imagem:', imageError);
        return res.status(500).json({
          success: false,
          error: {
            code: 'IMAGE_PROCESSING_ERROR',
            message: 'Erro ao processar foto',
          },
        });
      }
    }

    const visitanteAtualizado = await prisma.visitante.update({
      where: { id },
      data: updateData,
    });

    res.json({ 
      success: true,
      data: visitanteAtualizado 
    });
  } catch (error) {
    console.error('Erro ao atualizar visitante:', error);
    next(error);
  }
}

/**
 * PUT /api/visitantes/:id/foto
 */
async function atualizarFoto(req, res, next) {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FILE',
          message: 'Foto é obrigatória',
        },
      });
    }

    const visitante = await prisma.visitante.findUnique({
      where: { id },
    });

    if (!visitante) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Visitante não encontrado',
        },
      });
    }

    // Processar foto
    const { path: fotoPath, thumbnailPath } = await imageService.processarImagemVisitante(
      req.file.buffer,
      id,
      'visitantes'
    );

    const visitanteAtualizado = await prisma.visitante.update({
      where: { id },
      data: {
        foto: fotoPath,
        thumbnailUrl: thumbnailPath,
      },
      select: {
        id: true,
        foto: true,
        thumbnailUrl: true,
        dataAtualizacao: true,
      },
    });

    res.json({
      success: true,
      data: visitanteAtualizado,
    });
  } catch (error) {
    console.error('Erro ao atualizar foto:', error);
    next(error);
  }
}

/**
 * DELETE /api/visitantes/:id
 */
async function deletar(req, res, next) {
  try {
    const { id } = req.params;

    const visitante = await prisma.visitante.findUnique({
      where: { id },
      include: {
        registros: {
          take: 1,
        },
      },
    });

    if (!visitante) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Visitante não encontrado',
        },
      });
    }

    // Verificar se há registros associados
    if (visitante.registros.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Não é possível deletar visitante com registros de entrada/saída',
        },
      });
    }

    await prisma.visitante.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Visitante removido com sucesso',
    });
  } catch (error) {
    console.error('Erro ao deletar visitante:', error);
    next(error);
  }
}

module.exports = {
  listar,
  buscarPorId,
  buscarPorCPF,
  criar,
  atualizar,
  atualizarFoto,
  deletar,
};
