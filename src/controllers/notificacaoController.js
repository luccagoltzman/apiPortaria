const prisma = require('../config/database');
const notificacaoService = require('../services/notificacaoService');

/**
 * GET /api/notificacoes
 */
async function listar(req, res, next) {
  try {
    const { moradorId, lida } = req.query;

    const where = {};

    if (moradorId) {
      where.moradorId = moradorId;
    }

    if (lida !== undefined) {
      where.lida = lida === 'true';
    }

    const notificacoes = await prisma.notificacao.findMany({
      where,
      include: {
        morador: {
          include: { pessoa: true },
        },
      },
      orderBy: { dataEnvio: 'desc' },
    });

    res.json({ data: notificacoes });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/notificacoes/:id/lida
 */
async function marcarComoLida(req, res, next) {
  try {
    const { id } = req.params;

    const notificacao = await prisma.notificacao.update({
      where: { id },
      data: {
        lida: true,
        dataLeitura: new Date(),
      },
      include: {
        morador: {
          include: { pessoa: true },
        },
      },
    });

    res.json({ data: notificacao });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/notificacoes/enviar
 */
async function enviar(req, res, next) {
  try {
    const { moradorId, tipo, titulo, mensagem, registroId, metodo } = req.body;

    const resultado = await notificacaoService.criarNotificacao({
      moradorId,
      tipo,
      titulo,
      mensagem,
      registroId,
      metodo: metodo || 'APP',
    });

    res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  marcarComoLida,
  enviar,
};
