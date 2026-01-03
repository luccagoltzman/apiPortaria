const prisma = require('../config/database');

/**
 * Verifica se CPF está na blacklist
 */
async function verificarBlacklist(cpf) {
  const entrada = await prisma.blacklist.findFirst({
    where: {
      cpf: cpf.replace(/\D/g, ''),
      ativo: true,
    },
  });

  return {
    naBlacklist: !!entrada,
    entrada,
  };
}

/**
 * Adiciona CPF à blacklist
 */
async function adicionarBlacklist(cpf, nome, motivo, adicionadoPor) {
  const cpfLimpo = cpf.replace(/\D/g, '');
  
  // Verificar se já existe
  const existente = await prisma.blacklist.findUnique({
    where: { cpf: cpfLimpo },
  });

  if (existente) {
    // Reativar se estava inativo
    if (!existente.ativo) {
      return await prisma.blacklist.update({
        where: { id: existente.id },
        data: {
          ativo: true,
          motivo,
          dataRemocao: null,
        },
      });
    }
    throw new Error('CPF já está na blacklist');
  }

  return await prisma.blacklist.create({
    data: {
      cpf: cpfLimpo,
      nome,
      motivo,
      adicionadoPor,
    },
  });
}

/**
 * Remove CPF da blacklist (soft delete)
 */
async function removerBlacklist(id) {
  return await prisma.blacklist.update({
    where: { id },
    data: {
      ativo: false,
      dataRemocao: new Date(),
    },
  });
}

module.exports = {
  verificarBlacklist,
  adicionarBlacklist,
  removerBlacklist,
};
