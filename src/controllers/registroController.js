const prisma = require('../config/database');
const blacklistService = require('../services/blacklistService');
const imageService = require('../services/imageService');
const { validarCPF } = require('../utils/validators');

/**
 * GET /api/registros
 */
async function listar(req, res, next) {
  try {
    const { visitanteId, dataInicio, dataFim, tipo } = req.query;
    const { page, limit, skip } = req.pagination;

    const where = {};

    if (visitanteId) {
      where.visitanteId = visitanteId;
    }

    if (tipo) {
      where.tipo = tipo;
    }

    if (dataInicio || dataFim) {
      where.dataEntrada = {};
      if (dataInicio) {
        where.dataEntrada.gte = new Date(dataInicio);
      }
      if (dataFim) {
        where.dataEntrada.lte = new Date(dataFim);
      }
    }

    const [data, total] = await Promise.all([
      prisma.registroVisita.findMany({
        where,
        include: {
          visitante: {
            select: {
              id: true,
              nome: true,
              cpf: true,
            },
          },
          porteiro: {
            select: {
              id: true,
              nome: true,
              email: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { dataEntrada: 'desc' },
      }),
      prisma.registroVisita.count({ where }),
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
 * GET /api/registros/:id
 */
async function buscarPorId(req, res, next) {
  try {
    const { id } = req.params;

    const registro = await prisma.registroVisita.findUnique({
      where: { id },
      include: {
        visitante: {
          select: {
            id: true,
            nome: true,
            cpf: true,
          },
        },
        porteiro: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    if (!registro) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Registro não encontrado',
        },
      });
    }

    res.json({ success: true, data: registro });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/registros/entrada
 */
async function registrarEntrada(req, res, next) {
  try {
    const { visitanteId, sala, tipo, observacoes } = req.body;

    if (!visitanteId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'visitanteId é obrigatório',
        },
      });
    }

    // Buscar visitante
    const visitante = await prisma.visitante.findUnique({
      where: { id: visitanteId },
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

    // Verificar se visitante já está dentro
    if (visitante.status === 'DENTRO') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Visitante já está dentro do prédio',
        },
      });
    }

    // Verificar blacklist
    const { naBlacklist } = await blacklistService.verificarBlacklist(visitante.cpf);
    if (naBlacklist) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'BLACKLISTED',
          message: 'CPF está na blacklist',
        },
      });
    }

    // Processar foto se fornecida
    let fotoPath = null;
    let thumbnailPath = null;

    if (req.file) {
      // Validar se é arquivo de imagem (não URL)
      if (typeof req.file === 'string' || (req.file.mimetype && !req.file.mimetype.startsWith('image/'))) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Foto deve ser um arquivo de imagem válido',
          },
        });
      }

      try {
        const resultado = await imageService.processarImagemVisitante(
          req.file.buffer,
          visitante.id,
          'registros'
        );
        fotoPath = resultado.path;
        thumbnailPath = resultado.thumbnailPath;
      } catch (imageError) {
        console.error('Erro ao processar foto do registro:', imageError);
        return res.status(500).json({
          success: false,
          error: {
            code: 'IMAGE_PROCESSING_ERROR',
            message: 'Erro ao processar foto do registro',
          },
        });
      }
    }

    // Criar registro
    const registro = await prisma.registroVisita.create({
      data: {
        visitanteId,
        tipo: tipo || 'ENTRADA',
        sala: sala || null,
        observacoes: observacoes || null,
        foto: fotoPath,
        thumbnailUrl: thumbnailPath,
        metodoEntrada: 'DOCUMENTO',
        porteiroId: req.user?.id || null,
      },
      include: {
        visitante: {
          select: {
            id: true,
            nome: true,
            cpf: true,
            status: true,
            totalVisitas: true,
            ultimaVisita: true,
          },
        },
      },
    });

    // Atualizar visitante
    await prisma.visitante.update({
      where: { id: visitanteId },
      data: {
        status: 'DENTRO',
        totalVisitas: { increment: 1 },
        ultimaVisita: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      data: {
        registro,
        visitante: {
          id: visitante.id,
          status: 'DENTRO',
          totalVisitas: visitante.totalVisitas + 1,
          ultimaVisita: new Date(),
        },
      },
    });
  } catch (error) {
    console.error('Erro ao registrar entrada:', error);
    next(error);
  }
}

/**
 * POST /api/registros/saida
 */
async function registrarSaida(req, res, next) {
  try {
    const { visitanteId, observacoes } = req.body;

    if (!visitanteId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'visitanteId é obrigatório',
        },
      });
    }

    // Buscar visitante
    const visitante = await prisma.visitante.findUnique({
      where: { id: visitanteId },
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

    // Buscar último registro de entrada aberto
    const registroEntrada = await prisma.registroVisita.findFirst({
      where: {
        visitanteId,
        tipo: 'ENTRADA',
        dataSaida: null,
      },
      orderBy: {
        dataEntrada: 'desc',
      },
    });

    if (!registroEntrada) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Visitante não possui registro de entrada aberto',
        },
      });
    }

    // Atualizar registro de entrada com data de saída
    const registro = await prisma.registroVisita.update({
      where: { id: registroEntrada.id },
      data: {
        dataSaida: new Date(),
        observacoes: observacoes || registroEntrada.observacoes,
      },
      include: {
        visitante: {
          select: {
            id: true,
            nome: true,
            cpf: true,
          },
        },
      },
    });

    // Atualizar visitante
    await prisma.visitante.update({
      where: { id: visitanteId },
      data: {
        status: 'FORA',
      },
    });

    res.json({
      success: true,
      data: {
        registro: {
          ...registro,
          tipo: 'SAIDA',
        },
        visitante: {
          id: visitante.id,
          status: 'FORA',
        },
      },
    });
  } catch (error) {
    console.error('Erro ao registrar saída:', error);
    next(error);
  }
}

/**
 * GET /api/registros/estatisticas
 */
async function estatisticas(req, res, next) {
  try {
    const { periodo = 'hoje' } = req.query;

    let dateFrom;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    switch (periodo) {
      case 'hoje':
        dateFrom = hoje;
        break;
      case 'semana':
        dateFrom = new Date(hoje);
        dateFrom.setDate(dateFrom.getDate() - 7);
        break;
      case 'mes':
        dateFrom = new Date(hoje);
        dateFrom.setMonth(dateFrom.getMonth() - 1);
        break;
      case 'ano':
        dateFrom = new Date(hoje);
        dateFrom.setFullYear(dateFrom.getFullYear() - 1);
        break;
      default:
        dateFrom = hoje;
    }

    const [totalVisitas, visitasHoje, dentroAgora, visitantesFrequentes] = await Promise.all([
      prisma.registroVisita.count({
        where: {
          dataEntrada: { gte: dateFrom },
          tipo: 'ENTRADA',
        },
      }),
      prisma.registroVisita.count({
        where: {
          dataEntrada: { gte: hoje },
          tipo: 'ENTRADA',
        },
      }),
      prisma.visitante.count({
        where: {
          status: 'DENTRO',
        },
      }),
      prisma.registroVisita.groupBy({
        by: ['visitanteId'],
        where: {
          dataEntrada: { gte: dateFrom },
          tipo: 'ENTRADA',
        },
        _count: {
          visitanteId: true,
        },
        orderBy: {
          _count: {
            visitanteId: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    // Buscar nomes dos visitantes frequentes
    const visitantesFrequentesComNomes = await Promise.all(
      visitantesFrequentes.map(async (vf) => {
        const visitante = await prisma.visitante.findUnique({
          where: { id: vf.visitanteId },
        });
        return {
          visitanteId: vf.visitanteId,
          nome: visitante?.nome || 'Desconhecido',
          totalVisitas: vf._count.visitanteId,
        };
      })
    );

    res.json({
      success: true,
      data: {
        totalVisitas,
        visitasHoje,
        dentroAgora,
        visitantesFrequentes: visitantesFrequentesComNomes,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  buscarPorId,
  registrarEntrada,
  registrarSaida,
  estatisticas,
};
