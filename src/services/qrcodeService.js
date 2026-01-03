const QRCode = require('qrcode');
const crypto = require('crypto');

/**
 * Gera QR Code para visitante ou agendamento
 */
async function gerarQRCode(dados) {
  const qrcodeData = {
    id: dados.id || crypto.randomUUID(),
    tipo: dados.tipo, // 'VISITANTE' ou 'AGENDAMENTO'
    visitanteId: dados.visitanteId,
    agendamentoId: dados.agendamentoId,
    timestamp: Date.now(),
    validade: dados.validade || Date.now() + (24 * 60 * 60 * 1000), // 24 horas
  };

  // Gerar QR Code como base64
  const qrcodeBase64 = await QRCode.toDataURL(JSON.stringify(qrcodeData), {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    quality: 0.92,
    margin: 1,
  });

  return {
    qrcode: qrcodeBase64,
    qrcodeData,
  };
}

/**
 * Valida QR Code
 */
function validarQRCode(qrcodeData) {
  try {
    const data = typeof qrcodeData === 'string' ? JSON.parse(qrcodeData) : qrcodeData;

    // Verificar validade
    if (data.validade && Date.now() > data.validade) {
      return {
        valido: false,
        mensagem: 'QR Code expirado',
      };
    }

    return {
      valido: true,
      dados: data,
    };
  } catch (error) {
    return {
      valido: false,
      mensagem: 'QR Code inválido',
    };
  }
}

module.exports = {
  gerarQRCode,
  validarQRCode,
};
