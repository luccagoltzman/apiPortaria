const prisma = require('../config/database');
const { validarCPF } = require('../utils/validators');
const blacklistService = require('../services/blacklistService');
const imageService = require('../services/imageService');

/**
 * GET /api/visitantes
 */
async function listar(req, res, next) {
  try {
    const { search, status } = req.query;
    const { page, limit, skip } = req.pagination;

    const where = {};

    if (search) {
      where.OR = [
        { nome: { contains: search } },
        { cpf: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.visitante.findMany({
        where,
        include: {
          registros: {
            orderBy: { dataEntrada: 'desc' },
            take: 5,
          },
        },
        skip,
        take: limit,
        orderBy: { dataCadastro: 'desc' },
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
        registros: {
          orderBy: { dataEntrada: 'desc' },
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

    const visitante = await prisma.visitante.findUnique({
      where: { cpf: cpfLimpo },
      include: {
        registros: {
          orderBy: { dataEntrada: 'desc' },
          take: 10,
        },
      },
    });

    res.json({ data: visitante });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/visitantes
 */
async function criar(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FILE',
          message: 'Foto é obrigatória',
        },
      });
    }

    const { nome, cpf, dataNascimento } = req.body;
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

    // Verificar se visitante já existe
    const visitanteExistente = await prisma.visitante.findUnique({
      where: { cpf: cpfLimpo },
    });

    if (visitanteExistente) {
      return res.status(409).json({
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'Visitante já cadastrado',
        },
      });
    }

    // Gerar ID temporário para processar imagem
    const tempId = `temp_${Date.now()}`;
    
    // Processar imagem
    const { path: fotoPath, thumbnailPath } = await imageService.processarImagemVisitante(
      req.file.buffer,
      tempId,
      'visitantes'
    );

    // Criar visitante
    const visitante = await prisma.visitante.create({
      data: {
        nome,
        cpf: cpfLimpo,
        dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
        foto: fotoPath,
        thumbnailUrl: thumbnailPath,
        tipo: 'VISITA',
      },
    });

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
    const { nome, dataNascimento } = req.body;

    const visitante = await prisma.visitante.findUnique({
      where: { id },
    });

    if (!visitante) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Visitante não encontrado',
        },
      });
    }

    const updateData = {
      nome: nome || visitante.nome,
      dataNascimento: dataNascimento ? new Date(dataNascimento) : visitante.dataNascimento,
    };

    // Se nova foto foi enviada, processar
    if (req.file) {
      const { path: fotoPath, thumbnailPath } = await imageService.processarImagemVisitante(
        req.file.buffer,
        id,
        'visitantes'
      );
      updateData.foto = fotoPath;
      updateData.thumbnailUrl = thumbnailPath;
    }

    const visitanteAtualizado = await prisma.visitante.update({
      where: { id },
      data: updateData,
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
