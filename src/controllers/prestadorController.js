const prisma = require('../config/database');
const { validarCPF } = require('../utils/validators');

/**
 * GET /api/prestadores
 */
async function listar(req, res, next) {
  try {
    const prestadores = await prisma.prestador.findMany({
      where: {
        ativo: true,
      },
      include: {
        pessoa: true,
      },
      orderBy: { dataCadastro: 'desc' },
    });

    res.json({ data: prestadores });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/prestadores
 */
async function criar(req, res, next) {
  try {
    const dados = req.body;
    const cpfLimpo = dados.cpf.replace(/\D/g, '');

    if (!validarCPF(cpfLimpo)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_CPF',
          message: 'CPF inválido',
        },
      });
    }

    // Verificar se pessoa já existe
    let pessoa = await prisma.pessoa.findUnique({
      where: { cpf: cpfLimpo },
    });

    if (!pessoa) {
      pessoa = await prisma.pessoa.create({
        data: {
          nome: dados.nome,
          cpf: cpfLimpo,
          telefone: dados.telefone,
          email: dados.email || null,
        },
      });
    } else {
      // Verificar se já é prestador
      const prestadorExistente = await prisma.prestador.findUnique({
        where: { pessoaId: pessoa.id },
      });

      if (prestadorExistente) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_ENTRY',
            message: 'Prestador já cadastrado',
          },
        });
      }
    }

    // Criar prestador
    const prestador = await prisma.prestador.create({
      data: {
        pessoaId: pessoa.id,
        empresa: dados.empresa,
        servico: dados.servico,
        apartamentosPermitidos: dados.apartamentosPermitidos || [],
        dataValidade: dados.dataValidade ? new Date(dados.dataValidade) : null,
      },
      include: { pessoa: true },
    });

    res.status(201).json({ data: prestador });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listar,
  criar,
};
