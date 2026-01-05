const prisma = require('../config/database');
const QRCode = require('qrcode');

/**
 * GET /api/agendamentos
 */
async function listar(req, res, next) {
  try {
    const { visitanteId, dataInicio, dataFim } = req.query;
    const { page, limit, skip } = req.pagination;

    const where = {};

    if (visitanteId) {
      where.visitanteId = visitanteId;
    }

    if (dataInicio || dataFim) {
      where.dataAgendamento = {};
      if (dataInicio) {
        where.dataAgendamento.gte = new Date(dataInicio);
      }
      if (dataFim) {
        where.dataAgendamento.lte = new Date(dataFim);
      }
    }

    const [data, total] = await Promise.all([
      prisma.agendamento.findMany({
        where,
        include: {
          visitante: {
            select: {
              id: true,
              nome: true,
              cpf: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { dataAgendamento: 'asc' },
      }),
      prisma.agendamento.count({ where }),
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
 * POST /api/agendamentos
 */
async function criar(req, res, next) {
  try {
    const { visitanteId, dataAgendamento, sala, observacoes } = req.body;

    if (!visitanteId || !dataAgendamento) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'visitanteId e dataAgendamento são obrigatórios',
        },
      });
    }

    // Verificar se visitante existe
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

    // Validar data de agendamento
    const dataAgend = new Date(dataAgendamento);
    if (isNaN(dataAgend.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Data de agendamento inválida',
        },
      });
    }

    // Criar agendamento
    const agendamento = await prisma.agendamento.create({
      data: {
        visitanteId,
        dataAgendamento: dataAgend,
        sala: sala || null,
        observacoes: observacoes || null,
        status: 'PENDENTE',
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

    // Gerar QR Code
    let qrcodeBase64 = null;
    try {
      const qrcodeData = {
        agendamentoId: agendamento.id,
        visitanteId: visitanteId,
        dataAgendamento: dataAgendamento,
      };
      qrcodeBase64 = await QRCode.toDataURL(JSON.stringify(qrcodeData));
      
      // Atualizar agendamento com QR Code
      await prisma.agendamento.update({
        where: { id: agendamento.id },
        data: { qrcode: qrcodeBase64 },
      });
    } catch (qrcodeError) {
      console.error('Erro ao gerar QR Code:', qrcodeError);
      // Continuar mesmo se QR Code falhar
    }

    res.status(201).json({
      success: true,
      data: {
        ...agendamento,
        qrcode: qrcodeBase64,
      },
    });
  } catch (error) {
    console.error('Erro ao criar agendamento:', error);
    next(error);
  }
}

module.exports = {
  listar,
  criar,
};
