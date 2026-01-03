const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const visitanteRoutes = require('./visitanteRoutes');
const registroRoutes = require('./registroRoutes');
const moradorRoutes = require('./moradorRoutes');
const agendamentoRoutes = require('./agendamentoRoutes');
const qrcodeRoutes = require('./qrcodeRoutes');
const blacklistRoutes = require('./blacklistRoutes');
const prestadorRoutes = require('./prestadorRoutes');
const notificacaoRoutes = require('./notificacaoRoutes');

router.use('/auth', authRoutes);
router.use('/visitantes', visitanteRoutes);
router.use('/registros', registroRoutes);
router.use('/moradores', moradorRoutes);
router.use('/agendamentos', agendamentoRoutes);
router.use('/qrcode', qrcodeRoutes);
router.use('/blacklist', blacklistRoutes);
router.use('/prestadores', prestadorRoutes);
router.use('/notificacoes', notificacaoRoutes);

module.exports = router;
