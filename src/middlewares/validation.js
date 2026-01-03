const { schemas } = require('../utils/validators');

/**
 * Middleware de validação usando Zod
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error.errors) {
        return res.status(422).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Erro de validação',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
        });
      }
      next(error);
    }
  };
};

module.exports = {
  validate,
  schemas,
};
