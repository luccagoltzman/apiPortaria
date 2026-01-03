const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

/**
 * Middleware de autenticação JWT
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token de autenticação não fornecido',
        },
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Buscar usuário no banco
      const usuario = await prisma.usuario.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          nome: true,
          email: true,
          tipo: true,
          ativo: true,
        },
      });

      if (!usuario || !usuario.ativo) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Usuário não encontrado ou inativo',
          },
        });
      }

      req.user = usuario;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Token expirado',
          },
        });
      }
      throw error;
    }
  } catch (error) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token inválido',
      },
    });
  }
};

/**
 * Middleware de autorização por tipo de usuário
 */
const authorize = (...tiposPermitidos) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Usuário não autenticado',
        },
      });
    }

    if (!tiposPermitidos.includes(req.user.tipo)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Você não tem permissão para acessar este recurso',
        },
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
