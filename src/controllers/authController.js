const authService = require('../services/authService');

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password, senha } = req.body;
    // Aceitar tanto 'password' (especificação) quanto 'senha' (compatibilidade)
    const senhaFinal = password || senha;
    
    if (!email || !senhaFinal) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Email e senha são obrigatórios',
        },
      });
    }
    
    const result = await authService.login(email, senhaFinal);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: error.message || 'Email ou senha inválidos',
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
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: error.message || 'Token inválido ou expirado',
      },
    });
  }
}

module.exports = {
  login,
  refresh,
};
