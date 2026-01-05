/**
 * Middleware de tratamento de erros
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Erro de validação do Prisma
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: 'Registro duplicado',
        details: {
          field: err.meta?.target?.[0] || 'campo',
        },
      },
    });
  }

  // Erro de registro não encontrado
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Registro não encontrado',
      },
    });
  }

  // Erro de validação
  if (err.name === 'ZodError') {
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Erro de validação',
        details: err.errors,
      },
    });
  }

  // Erro padrão
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';

  return res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : message,
      ...(process.env.NODE_ENV === 'development' && { 
        details: err.message,
        stack: err.stack 
      }),
    },
  });
};

module.exports = errorHandler;
