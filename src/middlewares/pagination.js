/**
 * Middleware para processar parâmetros de paginação
 */
const pagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  req.pagination = {
    page: Math.max(1, page),
    limit: Math.min(100, Math.max(1, limit)), // Máximo 100 por página
    skip,
  };

  next();
};

module.exports = pagination;
