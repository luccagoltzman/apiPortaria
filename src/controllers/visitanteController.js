const prisma = require('../config/database');
const { validarCPF } = require('../utils/validators');
const blacklistService = require('../services/blacklistService');

/**
 * GET /api/visitantes
 */
async function listar(req, res, next) {
  try {
    const { search, status, tipo } = req.query;
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

    if (status) {
      where.status = status;
    }

    if (tipo) {
      where.tipo = tipo;
    }

    const [data, total] = await Promise.all([
      prisma.visitante.findMany({
        where,
        include: {
          pessoa: true,
          morador: {
            include: { pessoa: true },
          },
        },
        skip,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      prisma.visitante.count({ where }),
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
 * GET /api/visitantes/:id
 */
async function buscarPorId(req, res, next) {
  try {
    const { id } = req.params;

    const visitante = await prisma.visitante.findUnique({
      where: { id },
      include: {
        pessoa: true,
        morador: {
          include: { pessoa: true },
        },
        registros: {
          orderBy: { dataEntrada: 'desc' },
          take: 10,
        },
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

    res.json({ data: visitante });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/visitantes/buscar/:cpf
 */
async function buscarPorCPF(req, res, next) {
  try {
    const { cpf } = req.params;
    const cpfLimpo = cpf.replace(/\D/g, '');

    if (!validarCPF(cpfLimpo)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_CPF',
          message: 'CPF inválido',
        },
      });
    }

    const pessoa = await prisma.pessoa.findUnique({
      where: { cpf: cpfLimpo },
      include: {
        visitantes: {
          include: {
            morador: {
              include: { pessoa: true },
            },
          },
        },
      },
    });

    if (!pessoa || pessoa.visitantes.length === 0) {
      return res.json({ data: null });
    }

    res.json({ data: pessoa.visitantes[0] });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/visitantes
 */
async function criar(req, res, next) {
  try {
    const dados = req.body;
    const cpfLimpo = dados.cpf.replace(/\D/g, '');

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

    // Verificar se pessoa já existe
    let pessoa = await prisma.pessoa.findUnique({
      where: { cpf: cpfLimpo },
    });

    if (!pessoa) {
      // Criar pessoa
      pessoa = await prisma.pessoa.create({
        data: {
          nome: dados.nome,
          cpf: cpfLimpo,
          dataNascimento: dados.dataNascimento ? new Date(dados.dataNascimento) : null,
          telefone: dados.telefone,
          email: dados.email || null,
          foto: req.file ? `/uploads/${req.file.filename}` : null,
        },
      });
    } else {
      // Atualizar pessoa se necessário
      pessoa = await prisma.pessoa.update({
        where: { id: pessoa.id },
        data: {
          nome: dados.nome,
          dataNascimento: dados.dataNascimento ? new Date(dados.dataNascimento) : pessoa.dataNascimento,
          telefone: dados.telefone || pessoa.telefone,
          email: dados.email || pessoa.email,
          foto: req.file ? `/uploads/${req.file.filename}` : pessoa.foto,
        },
      });
    }

    // Criar ou atualizar visitante
    const visitanteExistente = await prisma.visitante.findFirst({
      where: { pessoaId: pessoa.id },
    });

    let visitante;
    if (visitanteExistente) {
      visitante = await prisma.visitante.update({
        where: { id: visitanteExistente.id },
        data: {
          tipo: dados.tipo,
          apartamento: dados.apartamento,
          observacoes: dados.observacoes,
        },
        include: { pessoa: true },
      });
    } else {
      visitante = await prisma.visitante.create({
        data: {
          pessoaId: pessoa.id,
          tipo: dados.tipo,
          apartamento: dados.apartamento,
          observacoes: dados.observacoes,
          moradorId: dados.moradorId || null,
        },
        include: { pessoa: true },
      });
    }

    res.status(201).json({ data: visitante });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/visitantes/:id
 */
async function atualizar(req, res, next) {
  try {
    const { id } = req.params;
    const dados = req.body;

    const visitante = await prisma.visitante.findUnique({
      where: { id },
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

    // Atualizar pessoa
    if (dados.nome || dados.telefone || dados.email) {
      await prisma.pessoa.update({
        where: { id: visitante.pessoaId },
        data: {
          nome: dados.nome || visitante.pessoa.nome,
          telefone: dados.telefone || visitante.pessoa.telefone,
          email: dados.email || visitante.pessoa.email,
        },
      });
    }

    // Atualizar visitante
    const visitanteAtualizado = await prisma.visitante.update({
      where: { id },
      data: {
        tipo: dados.tipo || visitante.tipo,
        apartamento: dados.apartamento || visitante.apartamento,
        observacoes: dados.observacoes || visitante.observacoes,
      },
      include: { pessoa: true },
    });

    res.json({ data: visitanteAtualizado });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/visitantes/:id
 */
async function deletar(req, res, next) {
  try {
    const { id } = req.params;

    await prisma.visitante.delete({
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
  buscarPorCPF,
  criar,
  atualizar,
  deletar,
};
