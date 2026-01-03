const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

/**
 * Gera token JWT
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, tipo: user.tipo },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

/**
 * Gera refresh token
 */
function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

/**
 * Login do usuário
 */
async function login(email, senha) {
  const usuario = await prisma.usuario.findUnique({
    where: { email },
  });

  if (!usuario || !usuario.ativo) {
    throw new Error('Email ou senha inválidos');
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senha);
  if (!senhaValida) {
    throw new Error('Email ou senha inválidos');
  }

  // Atualizar último acesso
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { ultimoAcesso: new Date() },
  });

  const token = generateToken(usuario);
  const refreshToken = generateRefreshToken(usuario);

  return {
    token,
    refreshToken,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo,
    },
  };
}

/**
 * Refresh token
 */
async function refreshToken(refreshToken) {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
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
      throw new Error('Token inválido');
    }

    const newToken = generateToken(usuario);
    return { token: newToken };
  } catch (error) {
    throw new Error('Token inválido ou expirado');
  }
}

module.exports = {
  login,
  refreshToken,
  generateToken,
};
