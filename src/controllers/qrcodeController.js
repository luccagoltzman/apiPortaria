const qrcodeService = require('../services/qrcodeService');
const prisma = require('../config/database');

/**
 * POST /api/qrcode/gerar
 */
async function gerar(req, res, next) {
  try {
    const { visitanteId, agendamentoId, dados } = req.body;

    let qrcodeDataInput = {
      tipo: 'VISITANTE',
      validade: Date.now() + (24 * 60 * 60 * 1000), // 24 horas
    };

    if (visitanteId) {
      const visitante = await prisma.visitante.findUnique({
        where: { id: visitanteId },
        include: { pessoa: true },
      });

      if (!visitante) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Visitante não encontrado',
          },
        });
      }

      qrcodeDataInput = {
        ...qrcodeDataInput,
        id: visitante.id,
        tipo: 'VISITANTE',
        visitanteId: visitante.id,
      };
    } else if (agendamentoId) {
      const agendamento = await prisma.agendamento.findUnique({
        where: { id: agendamentoId },
      });

      if (!agendamento) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Agendamento não encontrado',
          },
        });
      }

      qrcodeDataInput = {
        ...qrcodeDataInput,
        id: agendamento.id,
        tipo: 'AGENDAMENTO',
        agendamentoId: agendamento.id,
        validade: agendamento.dataHora.getTime() + (24 * 60 * 60 * 1000),
      };
    } else if (dados) {
      qrcodeDataInput = { ...qrcodeDataInput, ...dados };
    } else {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'É necessário fornecer visitanteId, agendamentoId ou dados',
        },
      });
    }

    const { qrcode, qrcodeData } = await qrcodeService.gerarQRCode(qrcodeDataInput);

    res.json({
      qrcode,
      qrcodeData,
      validade: new Date(qrcodeData.validade),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/qrcode/validar
 */
async function validar(req, res, next) {
  try {
    const { qrcodeData } = req.body;

    if (!qrcodeData) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Dados do QR Code são obrigatórios',
        },
      });
    }

    const validacao = qrcodeService.validarQRCode(qrcodeData);

    if (!validacao.valido) {
      return res.json({
        valido: false,
        mensagem: validacao.mensagem,
      });
    }

    const dados = validacao.dados;
    let visitante = null;
    let agendamento = null;

    if (dados.visitanteId) {
      visitante = await prisma.visitante.findUnique({
        where: { id: dados.visitanteId },
        include: {
          pessoa: true,
          morador: {
            include: { pessoa: true },
          },
        },
      });
    }

    if (dados.agendamentoId) {
      agendamento = await prisma.agendamento.findUnique({
        where: { id: dados.agendamentoId },
        include: {
          morador: {
            include: { pessoa: true },
          },
        },
      });
    }

    res.json({
      valido: true,
      visitante,
      agendamento,
      mensagem: 'QR Code válido',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  gerar,
  validar,
};
