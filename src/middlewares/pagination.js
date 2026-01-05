/**
 * Middleware para processar parâmetros de paginação
 * Suporta limit/offset (especificação) e page/limit (compatibilidade)
 */
const pagination = (req, res, next) => {
  // Priorizar limit/offset conforme especificação
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  
  // Se usar page/limit (compatibilidade)
  const page = parseInt(req.query.page);
  const skip = page ? (page - 1) * limit : offset;

  req.pagination = {
    limit: Math.min(100, Math.max(1, limit)), // Máximo 100 por página
    offset: skip,
    skip, // Alias para compatibilidade
    page: page || Math.floor(skip / limit) + 1,
  };

  next();
};

module.exports = pagination;
