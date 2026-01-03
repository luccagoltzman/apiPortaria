const prisma = require('../config/database');
const { validarCPF } = require('../utils/validators');

/**
 * GET /api/moradores
 */
async function listar(req, res, next) {
  try {
    const { search, apartamento, ativo } = req.query;
    const { page, limit, skip } = req.pagination;

    const where = {};

    if (search) {
      where.pessoa = {
        OR: [
          { nome: { contains: search } },
          { cpf: { contains: search } },
        ],
      };
    }

    if (apartamento) {
      where.apartamento = apartamento;
    }

    if (ativo !== undefined) {
      where.ativo = ativo === 'true';
    }

    const [data, total] = await Promise.all([
      prisma.morador.findMany({
        where,
        include: {
          pessoa: true,
        },
        skip,
        take: limit,
        orderBy: { dataCadastro: 'desc' },
      }),
      prisma.morador.count({ where }),
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
 * GET /api/moradores/:id
 */
async function buscarPorId(req, res, next) {
  try {
    const { id } = req.params;

    const morador = await prisma.morador.findUnique({
      where: { id },
      include: {
        pessoa: true,
        visitantes: {
          include: { pessoa: true },
        },
        agendamentos: {
          orderBy: { dataHora: 'desc' },
          take: 10,
        },
      },
    });

    if (!morador) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Morador não encontrado',
        },
      });
    }

    res.json({ data: morador });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/moradores
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
          dataNascimento: dados.dataEntrada ? new Date(dados.dataEntrada) : null,
          telefone: dados.telefone,
          email: dados.email || null,
        },
      });
    } else {
      // Verificar se já é morador
      const moradorExistente = await prisma.morador.findUnique({
        where: { pessoaId: pessoa.id },
      });

      if (moradorExistente) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE_ENTRY',
            message: 'Morador já cadastrado',
          },
        });
      }
    }

    // Criar morador
    const morador = await prisma.morador.create({
      data: {
        pessoaId: pessoa.id,
        apartamento: dados.apartamento,
        bloco: dados.bloco,
        tipoUnidade: dados.tipoUnidade,
        dataEntrada: dados.dataEntrada ? new Date(dados.dataEntrada) : null,
        telefoneEmergencia: dados.telefoneEmergencia,
      },
      include: { pessoa: true },
    });

    res.status(201).json({ data: morador });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/moradores/:id
 */
async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const dados = req.body;

    const morador = await prisma.morador.findUnique({
      where: { id },
      include: { pessoa: true },
    });

    if (!morador) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Morador não encontrado',
        },
      });
    }

    // Atualizar pessoa
    if (dados.nome || dados.telefone || dados.email) {
      await prisma.pessoa.update({
        where: { id: morador.pessoaId },
        data: {
          nome: dados.nome || morador.pessoa.nome,
          telefone: dados.telefone || morador.pessoa.telefone,
          email: dados.email || morador.pessoa.email,
        },
      });
    }

    // Atualizar morador
    const moradorAtualizado = await prisma.morador.update({
      where: { id },
      data: {
        apartamento: dados.apartamento || morador.apartamento,
        bloco: dados.bloco !== undefined ? dados.bloco : morador.bloco,
        tipoUnidade: dados.tipoUnidade || morador.tipoUnidade,
        dataEntrada: dados.dataEntrada ? new Date(dados.dataEntrada) : morador.dataEntrada,
        dataSaida: dados.dataSaida ? new Date(dados.dataSaida) : morador.dataSaida,
        ativo: dados.ativo !== undefined ? dados.ativo : morador.ativo,
        notificacoesAtivas: dados.notificacoesAtivas !== undefined ? dados.notificacoesAtivas : morador.notificacoesAtivas,
        telefoneEmergencia: dados.telefoneEmergencia !== undefined ? dados.telefoneEmergencia : morador.telefoneEmergencia,
      },
      include: { pessoa: true },
    });

    res.json({ data: moradorAtualizado });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/moradores/:id
 */
async function deletar(req, res, next) {
  try {
    const { id } = req.params;

    await prisma.morador.delete({
      where: { id },
    });

    res.status(204).send();
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
};
