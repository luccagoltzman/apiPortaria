const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const { validarCPF } = require('../utils/validators');

/**
 * Processa imagem com OCR usando Tesseract
 */
async function processarImagemOCR(imageBuffer) {
  try {
    // Melhorar qualidade da imagem antes do OCR
    const imagemProcessada = await sharp(imageBuffer)
      .greyscale() // Converter para escala de cinza
      .normalize() // Normalizar brilho/contraste
      .sharpen() // Aumentar nitidez
      .toBuffer();

    // Processar com Tesseract (português)
    const { data } = await Tesseract.recognize(imagemProcessada, 'por', {
      logger: (m) => {
        // Log opcional para debug
        if (m.status === 'recognizing text') {
          // console.log(`Progresso: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    return {
      texto: data.text,
      confianca: data.confidence / 100, // Converter de 0-100 para 0-1
    };
  } catch (error) {
    throw new Error(`Erro ao processar OCR: ${error.message}`);
  }
}

/**
 * Extrai nome do texto do documento
 */
function extrairNome(texto) {
  if (!texto) return null;

  // Buscar padrão "NOME" seguido de texto
  const padraoNome = /NOME[:\s]+([A-ZÁÉÍÓÚÇÃÊÔ\s]{10,50})/i;
  const match = padraoNome.exec(texto);

  if (match) {
    let nome = match[1].trim();
    // Limpar: remover números, datas, caracteres especiais
    nome = nome.replace(/\d+/g, '');
    nome = nome.replace(/\d{2}\/\d{2}\/\d{4}/g, '');
    nome = nome.replace(/[^\w\sÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/g, '');
    nome = nome.replace(/\s+/g, ' ').trim();
    
    // Validar que tem pelo menos 3 palavras e não é muito curto
    const palavras = nome.split(' ').filter(p => p.length > 2);
    if (palavras.length >= 2 && nome.length >= 10) {
      return nome.toUpperCase();
    }
  }

  // Tentar buscar linha que parece ser nome (muitas letras maiúsculas, poucos números)
  const linhas = texto.split('\n');
  for (const linha of linhas) {
    const linhaLimpa = linha.trim();
    if (linhaLimpa.length >= 10 && linhaLimpa.length <= 50) {
      const letras = (linhaLimpa.match(/[A-ZÁÉÍÓÚÇÃÊÔ]/g) || []).length;
      const numeros = (linhaLimpa.match(/\d/g) || []).length;
      const ratio = letras / linhaLimpa.length;
      
      // Se tem mais de 70% letras e menos de 20% números
      if (ratio > 0.7 && numeros / linhaLimpa.length < 0.2) {
        const nomeLimpo = linhaLimpa.replace(/[^\w\sÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/g, '').trim();
        if (nomeLimpo.length >= 10) {
          return nomeLimpo.toUpperCase();
        }
      }
    }
  }

  return null;
}

/**
 * Extrai CPF do texto do documento
 */
function extrairCPF(texto) {
  if (!texto) return null;

  // Remover espaços
  const textoLimpo = texto.replace(/\s/g, '');

  // Buscar CPF formatado (XXX.XXX.XXX-XX)
  const padraoFormatado = /\d{3}\.\d{3}\.\d{3}-\d{2}/;
  const matchFormatado = padraoFormatado.exec(textoLimpo);

  if (matchFormatado) {
    const cpf = matchFormatado[0].replace(/[.-]/g, '');
    if (validarCPF(cpf)) {
      return cpf;
    }
  }

  // Buscar 11 dígitos consecutivos
  const padraoSimples = /\b\d{11}\b/g;
  const matches = textoLimpo.match(padraoSimples);

  if (matches) {
    for (const cpf of matches) {
      if (validarCPF(cpf)) {
        return cpf;
      }
    }
  }

  // Buscar próximo a palavra "CPF"
  const padraoProximoCPF = /CPF[:\s]*([\d.\-\s]{11,14})/i;
  const matchProximo = padraoProximoCPF.exec(texto);

  if (matchProximo) {
    const cpfCandidato = matchProximo[1].replace(/[.\-\s]/g, '');
    if (cpfCandidato.length === 11 && validarCPF(cpfCandidato)) {
      return cpfCandidato;
    }
  }

  return null;
}

/**
 * Extrai data de nascimento do texto do documento
 */
function extrairDataNascimento(texto) {
  if (!texto) return null;

  // Buscar padrão de data próximo a "NASCIMENTO"
  const padraoDataNasc = /(?:NASCIMENTO|NASC|DATA[:\s]+DE[:\s]+NASCIMENTO)[:\s]*(\d{2}\/\d{2}\/\d{4})/i;
  const matchNasc = padraoDataNasc.exec(texto);

  if (matchNasc) {
    const dataStr = matchNasc[1];
    if (validarData(dataStr)) {
      return dataStr;
    }
  }

  // Buscar todas as datas no formato DD/MM/YYYY
  const padraoGeral = /\b\d{2}\/\d{2}\/\d{4}\b/g;
  const matches = texto.match(padraoGeral) || [];

  const datasValidas = [];
  for (const dataStr of matches) {
    if (validarData(dataStr)) {
      const [dia, mes, ano] = dataStr.split('/');
      const data = new Date(ano, mes - 1, dia);
      datasValidas.push({ data, dataStr });
    }
  }

  if (datasValidas.length > 0) {
    // Ordenar por data (mais antiga primeiro)
    datasValidas.sort((a, b) => a.data - b.data);
    // Retornar a data mais antiga (provavelmente data de nascimento)
    return datasValidas[0].dataStr;
  }

  return null;
}

/**
 * Valida se uma data está no formato DD/MM/YYYY e é no passado
 */
function validarData(dataStr) {
  const padrao = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = padrao.exec(dataStr);

  if (!match) return false;

  const dia = parseInt(match[1], 10);
  const mes = parseInt(match[2], 10);
  const ano = parseInt(match[3], 10);

  // Validar mês
  if (mes < 1 || mes > 12) return false;

  // Validar dia
  const diasNoMes = new Date(ano, mes, 0).getDate();
  if (dia < 1 || dia > diasNoMes) return false;

  // Validar que é no passado
  const data = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  if (data >= hoje) return false;

  // Validar que não é muito antiga (antes de 1900)
  if (ano < 1900) return false;

  return true;
}

/**
 * Extrai dados estruturados do texto do OCR
 */
function extrairDados(texto) {
  const nome = extrairNome(texto);
  const cpf = extrairCPF(texto);
  const dataNascimento = extrairDataNascimento(texto);

  return {
    nome,
    cpf,
    dataNascimento,
  };
}

/**
 * Valida imagem antes do processamento
 */
function validarImagem(file) {
  // Verificar se arquivo existe
  if (!file) {
    throw new Error('Arquivo de imagem é obrigatório');
  }

  // Verificar tamanho (5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('Arquivo excede o tamanho máximo permitido (5MB)');
  }

  // Verificar tipo MIME
  const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!tiposPermitidos.includes(file.mimetype)) {
    throw new Error('Tipo de arquivo não suportado. Use JPEG, PNG ou WEBP');
  }

  return true;
}

module.exports = {
  processarImagemOCR,
  extrairDados,
  validarImagem,
};
