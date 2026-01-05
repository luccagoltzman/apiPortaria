const authService = require('../services/authService');

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, senha } = req.body;
    const result = await authService.login(email, senha);
    
    res.json({
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: error.message,
      },
    });
  }
}

/**
 * POST /api/auth/refresh
 */
async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken(refreshToken);
    
    res.json(result);
  } catch (error) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: error.message,
      },
    });
  }
}

module.exports = {
  login,
  refresh,
};
