const prisma = require('../config/database');
const blacklistService = require('../services/blacklistService');

/**
 * GET /api/blacklist
 */
async function listar(req, res, next) {
  try {
    const blacklist = await prisma.blacklist.findMany({
      where: {
        ativo: true,
      },
      include: {
        adicionadoPorUsuario: {
          select: {
            id: true,
            nome: true,
            email: true,
          },
        },
      },
      orderBy: { dataAdicao: 'desc' },
    });

    res.json({ success: true, data: blacklist });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/blacklist
 */
async function adicionar(req, res, next) {
  try {
    const { cpf, nome, motivo } = req.body;

    const entrada = await blacklistService.adicionarBlacklist(
      cpf,
      nome,
      motivo,
      req.user.id
    );

    res.status(201).json({ success: true, data: entrada });
  } catch (error) {
    if (error.message.includes('já está na blacklist')) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: error.message,
        },
      });
    }
    next(error);
  }
}

/**
 * DELETE /api/blacklist/:id
 */
async function remover(req, res, next) {
  try {
    const { id } = req.params;

    await blacklistService.removerBlacklist(id);

    res.json({
      success: true,
      message: 'Pessoa removida da blacklist',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/blacklist/verificar/:cpf
 */
async function verificar(req, res, next) {
  try {
    const { cpf } = req.params;
    const resultado = await blacklistService.verificarBlacklist(cpf);

    res.json({ success: true, ...resultado });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  adicionar,
  remover,
  verificar,
};
