const prisma = require('../config/database');
const blacklistService = require('../services/blacklistService');
const notificacaoService = require('../services/notificacaoService');
const qrcodeService = require('../services/qrcodeService');

/**
 * GET /api/registros
 */
async function listar(req, res, next) {
  try {
    const { status, tipo, dateFrom, dateTo, apartamento } = req.query;
    const { page, limit, skip } = req.pagination;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (tipo) {
      where.tipo = tipo;
    }

    if (apartamento) {
      where.apartamento = apartamento;
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
          visitante: {
            include: { pessoa: true },
          },
          morador: {
            include: { pessoa: true },
          },
          porteiro: true,
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
        visitante: {
          include: { pessoa: true },
        },
        morador: {
          include: { pessoa: true },
        },
        porteiro: true,
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
 */
async function registrarEntrada(req, res, next) {
  try {
    const { visitanteId, apartamento, tipo, observacoes, metodoEntrada, qrcodeData } = req.body;

    // Buscar visitante
    const visitante = await prisma.visitante.findUnique({
      where: { id: visitanteId },
      include: {
        pessoa: true,
        morador: true,
      },
    });

    if (!visitante) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Visitante não encontrado',
        },
      });
    }

    // Verificar blacklist
    const { naBlacklist } = await blacklistService.verificarBlacklist(visitante.pessoa.cpf);
    if (naBlacklist) {
      return res.status(403).json({
        error: {
          code: 'BLACKLISTED',
          message: 'CPF está na blacklist',
        },
      });
    }

    // Validar QR Code se método for QRCODE
    if (metodoEntrada === 'QRCODE' && qrcodeData) {
      const validacao = qrcodeService.validarQRCode(qrcodeData);
      if (!validacao.valido) {
        return res.status(400).json({
          error: {
            code: 'INVALID_QRCODE',
            message: validacao.mensagem,
          },
        });
      }
    }

    // Criar registro
    const registro = await prisma.registroVisita.create({
      data: {
        visitanteId,
        moradorId: visitante.moradorId,
        tipo,
        apartamento,
        observacoes,
        foto: req.file ? `/uploads/${req.file.filename}` : null,
        metodoEntrada,
        qrcodeData: qrcodeData || null,
        porteiroId: req.user?.id || null,
      },
      include: {
        visitante: {
          include: { pessoa: true },
        },
        morador: {
          include: { pessoa: true },
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
        apartamento: apartamento || visitante.apartamento,
      },
    });

    // Enviar notificação
    let notificacaoEnviada = false;
    if (visitante.moradorId) {
      try {
        await notificacaoService.notificarVisita(visitante.moradorId, registro.id, tipo);
        notificacaoEnviada = true;
      } catch (error) {
        console.error('Erro ao enviar notificação:', error);
      }
    }

    res.status(201).json({
      data: registro,
      notificacaoEnviada,
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
    const { observacoes } = req.body;

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
        observacoes: observacoes || registro.observacoes,
      },
      include: {
        visitante: {
          include: { pessoa: true },
        },
        morador: {
          include: { pessoa: true },
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

    const [totalVisitas, visitasHoje, dentroAgora, porTipo, visitantesFrequentes] = await Promise.all([
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
        by: ['tipo'],
        where: {
          dataEntrada: { gte: dateFrom },
        },
        _count: true,
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
          include: { pessoa: true },
        });
        return {
          visitanteId: vf.visitanteId,
          nome: visitante?.pessoa.nome || 'Desconhecido',
          totalVisitas: vf._count.visitanteId,
        };
      })
    );

    const porTipoObj = {
      VISITA: 0,
      ENTREGA: 0,
      PRESTADOR: 0,
      OUTRO: 0,
    };

    porTipo.forEach((pt) => {
      porTipoObj[pt.tipo] = pt._count;
    });

    res.json({
      totalVisitas,
      visitasHoje,
      dentroAgora,
      porTipo: porTipoObj,
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
