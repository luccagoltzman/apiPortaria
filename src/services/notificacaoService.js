const prisma = require('../config/database');

/**
 * Cria notificação
 */
async function criarNotificacao(dados) {
  const notificacao = await prisma.notificacao.create({
    data: {
      moradorId: dados.moradorId,
      tipo: dados.tipo,
      titulo: dados.titulo,
      mensagem: dados.mensagem,
      registroId: dados.registroId,
      metodo: dados.metodo || 'APP',
    },
  });

  // Aqui você pode adicionar lógica para enviar por email, SMS, WhatsApp
  // Por enquanto, apenas criamos a notificação no banco

  return {
    data: notificacao,
    enviado: true,
  };
}

/**
 * Envia notificação de visita
 */
async function notificarVisita(moradorId, registroId, tipo = 'VISITA') {
  const morador = await prisma.morador.findUnique({
    where: { id: moradorId },
    include: { pessoa: true },
  });

  if (!morador || !morador.notificacoesAtivas) {
    return null;
  }

  const titulos = {
    VISITA: 'Nova visita',
    ENTREGA: 'Nova entrega',
    PRESTADOR: 'Prestador de serviço',
  };

  const mensagens = {
    VISITA: `Você tem uma visita no apartamento ${morador.apartamento}`,
    ENTREGA: `Você tem uma entrega no apartamento ${morador.apartamento}`,
    PRESTADOR: `Um prestador de serviço chegou no apartamento ${morador.apartamento}`,
  };

  return await criarNotificacao({
    moradorId,
    tipo,
    titulo: titulos[tipo] || 'Notificação',
    mensagem: mensagens[tipo] || 'Nova notificação',
    registroId,
    metodo: 'APP',
  });
}

module.exports = {
  criarNotificacao,
  notificarVisita,
};
