const prisma = require('../config/database');
const qrcodeService = require('../services/qrcodeService');
const notificacaoService = require('../services/notificacaoService');

/**
 * GET /api/agendamentos
 */
async function listar(req, res, next) {
  try {
    const { status, dataInicio, dataFim, apartamento } = req.query;
    const { page, limit, skip } = req.pagination;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (apartamento) {
      where.apartamento = apartamento;
    }

    if (dataInicio || dataFim) {
      where.dataHora = {};
      if (dataInicio) {
        where.dataHora.gte = new Date(dataInicio);
      }
      if (dataFim) {
        where.dataHora.lte = new Date(dataFim);
      }
    }

    const [data, total] = await Promise.all([
      prisma.agendamento.findMany({
        where,
        include: {
          morador: {
            include: { pessoa: true },
          },
        },
        skip,
        take: limit,
        orderBy: { dataHora: 'asc' },
      }),
      prisma.agendamento.count({ where }),
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
 * GET /api/agendamentos/:id
 */
async function buscarPorId(req, res, next) {
  try {
    const { id } = req.params;

    const agendamento = await prisma.agendamento.findUnique({
      where: { id },
      include: {
        morador: {
          include: { pessoa: true },
        },
      },
    });

    if (!agendamento) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Agendamento não encontrado',
        },
      });
    }

    res.json({ data: agendamento });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/agendamentos
 */
async function criar(req, res, next) {
  try {
    const dados = req.body;
    const dataHora = new Date(dados.dataHora);

    // Verificar se data é futura
    if (dataHora <= new Date()) {
      return res.status(400).json({
        error: {
          code: 'INVALID_DATE',
          message: 'Data/hora deve ser futura',
        },
      });
    }

    // Verificar se morador existe e está ativo
    const morador = await prisma.morador.findUnique({
      where: { id: dados.moradorId },
    });

    if (!morador || !morador.ativo) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Morador não encontrado ou inativo',
        },
      });
    }

    // Verificar conflito de agendamento
    const conflito = await prisma.agendamento.findFirst({
      where: {
        apartamento: dados.apartamento,
        dataHora: {
          gte: new Date(dataHora.getTime() - 30 * 60 * 1000), // 30 minutos antes
          lte: new Date(dataHora.getTime() + 30 * 60 * 1000), // 30 minutos depois
        },
        status: {
          in: ['PENDENTE', 'CONFIRMADO'],
        },
      },
    });

    if (conflito) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Já existe um agendamento para este horário',
        },
      });
    }

    // Criar agendamento
    const agendamento = await prisma.agendamento.create({
      data: {
        nomeVisitante: dados.nomeVisitante,
        cpfVisitante: dados.cpfVisitante?.replace(/\D/g, '') || null,
        telefone: dados.telefone,
        apartamento: dados.apartamento,
        moradorId: dados.moradorId,
        dataHora,
        tipo: dados.tipo,
        observacoes: dados.observacoes,
      },
      include: {
        morador: {
          include: { pessoa: true },
        },
      },
    });

    // Enviar notificação
    try {
      await notificacaoService.criarNotificacao({
        moradorId: dados.moradorId,
        tipo: 'AGENDAMENTO',
        titulo: 'Novo agendamento',
        mensagem: `Agendamento para ${dados.nomeVisitante} no dia ${dataHora.toLocaleString('pt-BR')}`,
        metodo: 'APP',
      });
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
    }

    res.status(201).json({ data: agendamento });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/agendamentos/:id
 */
async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const dados = req.body;

    const agendamento = await prisma.agendamento.findUnique({
      where: { id },
    });

    if (!agendamento) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Agendamento não encontrado',
        },
      });
    }

    const updateData = {};

    if (dados.status) {
      updateData.status = dados.status;
    }

    if (dados.dataHora) {
      const dataHora = new Date(dados.dataHora);
      if (dataHora <= new Date() && dados.status !== 'CANCELADO') {
        return res.status(400).json({
          error: {
            code: 'INVALID_DATE',
            message: 'Data/hora deve ser futura',
          },
        });
      }
      updateData.dataHora = dataHora;
    }

    const agendamentoAtualizado = await prisma.agendamento.update({
      where: { id },
      data: updateData,
      include: {
        morador: {
          include: { pessoa: true },
        },
      },
    });

    res.json({ data: agendamentoAtualizado });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/agendamentos/:id
 */
async function deletar(req, res, next) {
  try {
    const { id } = req.params;

    await prisma.agendamento.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/agendamentos/:id/gerar-qrcode
 */
async function gerarQRCode(req, res, next) {
  try {
    const { id } = req.params;

    const agendamento = await prisma.agendamento.findUnique({
      where: { id },
    });

    if (!agendamento) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Agendamento não encontrado',
        },
      });
    }

    const { qrcode, qrcodeData } = await qrcodeService.gerarQRCode({
      id: agendamento.id,
      tipo: 'AGENDAMENTO',
      agendamentoId: agendamento.id,
      validade: agendamento.dataHora.getTime() + (24 * 60 * 60 * 1000), // 24 horas após agendamento
    });

    // Atualizar agendamento
    await prisma.agendamento.update({
      where: { id },
      data: {
        qrcodeGerado: true,
        qrcodeData,
      },
    });

    res.json({
      qrcode,
      qrcodeData,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  deletar,
  gerarQRCode,
};
