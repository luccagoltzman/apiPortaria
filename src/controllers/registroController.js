const prisma = require('../config/database');
const blacklistService = require('../services/blacklistService');
const imageService = require('../services/imageService');
const { validarCPF } = require('../utils/validators');

/**
 * GET /api/registros
 */
async function listar(req, res, next) {
  try {
    const { status, dateFrom, dateTo } = req.query;
    const { page, limit, skip } = req.pagination;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.dataEntrada = {};
      if (dateFrom) {
        where.dataEntrada.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.dataEntrada.lte = new Date(dateTo);
      }
    }

    const [data, total] = await Promise.all([
      prisma.registroVisita.findMany({
        where,
        include: {
          visitante: true,
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
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
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
        visitante: true,
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
        error: {
          code: 'NOT_FOUND',
          message: 'Registro não encontrado',
        },
      });
    }

    res.json({ data: registro });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/registros/entrada
 * Pode receber visitanteId OU criar novo visitante com nome, cpf, dataNascimento
 */
async function registrarEntrada(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FILE',
          message: 'Foto facial é obrigatória',
        },
      });
    }

    const { visitanteId, nome, cpf, dataNascimento } = req.body;
    let visitante;

    // Se visitanteId fornecido, buscar visitante existente
    if (visitanteId) {
      visitante = await prisma.visitante.findUnique({
        where: { id: visitanteId },
      });

      if (!visitante) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Visitante não encontrado',
          },
        });
      }
    } else {
      // Criar novo visitante
      if (!nome || !cpf) {
        return res.status(400).json({
          error: {
            code: 'MISSING_DATA',
            message: 'Nome e CPF são obrigatórios quando visitanteId não é fornecido',
          },
        });
      }

      const cpfLimpo = cpf.replace(/\D/g, '');

      if (!validarCPF(cpfLimpo)) {
        return res.status(400).json({
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
          error: {
            code: 'BLACKLISTED',
            message: 'CPF está na blacklist',
          },
        });
      }

      // Verificar se já existe
      const existente = await prisma.visitante.findUnique({
        where: { cpf: cpfLimpo },
      });

      if (existente) {
        visitante = existente;
      } else {
        // Processar foto do visitante
        const tempId = `temp_${Date.now()}`;
        const { path: fotoPath, thumbnailPath } = await imageService.processarImagemVisitante(
          req.file.buffer,
          tempId,
          'visitantes'
        );

        // Criar visitante
        visitante = await prisma.visitante.create({
          data: {
            nome,
            cpf: cpfLimpo,
            dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
            foto: fotoPath,
            thumbnailUrl: thumbnailPath,
            tipo: 'VISITA',
          },
        });
      }
    }

    // Verificar blacklist novamente
    const { naBlacklist } = await blacklistService.verificarBlacklist(visitante.cpf);
    if (naBlacklist) {
      return res.status(403).json({
        error: {
          code: 'BLACKLISTED',
          message: 'CPF está na blacklist',
        },
      });
    }

    // Processar foto do registro
    const { path: fotoPath, thumbnailPath } = await imageService.processarImagemVisitante(
      req.file.buffer,
      visitante.id,
      'registros'
    );

    // Criar registro
    const registro = await prisma.registroVisita.create({
      data: {
        visitanteId: visitante.id,
        foto: fotoPath,
        thumbnailUrl: thumbnailPath,
        metodoEntrada: 'DOCUMENTO',
        porteiroId: req.user?.id || null,
      },
      include: {
        visitante: true,
      },
    });

    // Atualizar visitante
    await prisma.visitante.update({
      where: { id: visitante.id },
      data: {
        status: 'DENTRO',
        totalVisitas: { increment: 1 },
        ultimaVisita: new Date(),
      },
    });

    res.status(201).json({
      data: {
        registro,
        visitante,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/registros/:id/saida
 */
async function registrarSaida(req, res, next) {
  try {
    const { id } = req.params;

    const registro = await prisma.registroVisita.findUnique({
      where: { id },
      include: { visitante: true },
    });

    if (!registro) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Registro não encontrado',
        },
      });
    }

    if (registro.status === 'FORA') {
      return res.status(400).json({
        error: {
          code: 'ALREADY_EXITED',
          message: 'Saída já registrada',
        },
      });
    }

    // Atualizar registro
    const registroAtualizado = await prisma.registroVisita.update({
      where: { id },
      data: {
        status: 'FORA',
        dataSaida: new Date(),
      },
      include: {
        visitante: true,
        porteiro: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    // Atualizar visitante
    await prisma.visitante.update({
      where: { id: registro.visitanteId },
      data: {
        status: 'FORA',
      },
    });

    res.json({ data: registroAtualizado });
  } catch (error) {
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
        },
      }),
      prisma.registroVisita.count({
        where: {
          dataEntrada: { gte: hoje },
        },
      }),
      prisma.registroVisita.count({
        where: {
          status: 'DENTRO',
        },
      }),
      prisma.registroVisita.groupBy({
        by: ['visitanteId'],
        where: {
          dataEntrada: { gte: dateFrom },
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
      totalVisitas,
      visitasHoje,
      dentroAgora,
      visitantesFrequentes: visitantesFrequentesComNomes,
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
