const { z } = require('zod');

/**
 * Valida CPF brasileiro
 * @param {string} cpf - CPF sem formatação (11 dígitos)
 * @returns {boolean}
 */
function validarCPF(cpf) {
  if (!cpf) return false;
  
  // Remove caracteres não numéricos
  cpf = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  // Validação dos dígitos verificadores
  let soma = 0;
  let resto;
  
  for (let i = 1; i <= 9; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  
  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;
  
  return true;
}

/**
 * Formata CPF (000.000.000-00)
 */
function formatarCPF(cpf) {
  if (!cpf) return '';
  const cpfLimpo = cpf.replace(/\D/g, '');
  return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata telefone ((00) 00000-0000)
 */
function formatarTelefone(telefone) {
  if (!telefone) return '';
  const telLimpo = telefone.replace(/\D/g, '');
  if (telLimpo.length === 11) {
    return telLimpo.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (telLimpo.length === 10) {
    return telLimpo.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return telefone;
}

// Schemas de validação Zod
const schemas = {
  login: z.object({
    email: z.string().email('Email inválido'),
    senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  }),

  visitante: z.object({
    nome: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
    cpf: z.string().refine(validarCPF, 'CPF inválido'),
    dataNascimento: z.string().optional(),
  }),

  blacklist: z.object({
    cpf: z.string().refine(validarCPF, 'CPF inválido'),
    nome: z.string().min(3).max(100),
    motivo: z.string().min(10).max(500),
  }),
};

module.exports = {
  validarCPF,
  formatarCPF,
  formatarTelefone,
  schemas,
};
