const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { validarTipoImagem, validarTamanhoArquivo } = require('../services/imageService');

// Criar diretório de uploads se não existir
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração de storage (armazenamento em memória para processamento)
const storage = multer.memoryStorage();

// Filtro de arquivos (apenas imagens)
const fileFilter = (req, file, cb) => {
  console.log('Multer recebeu arquivo:', {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });
  
  if (!validarTipoImagem(file.mimetype)) {
    return cb(new Error('Apenas imagens são permitidas (JPEG, PNG, WEBP)'));
  }
  
  cb(null, true);
};

// Configuração do multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB
  },
  fileFilter: fileFilter
});

module.exports = upload;
