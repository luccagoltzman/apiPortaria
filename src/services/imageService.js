const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Processa e salva imagem do visitante
 * @param {Buffer} imageBuffer - Buffer da imagem
 * @param {string} visitanteId - ID do visitante
 * @param {string} tipo - 'visitante' ou 'registro'
 * @returns {Promise<{path: string, thumbnailPath: string, dimensoes: {width: number, height: number}}>}
 */
async function processarImagemVisitante(imageBuffer, visitanteId, tipo = 'visitante') {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
  
  // Criar estrutura de pastas
  const baseDir = path.join(process.env.UPLOAD_PATH || './uploads', tipo, String(year), month);
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  
  // Remover "temp_" do ID se existir
  const cleanId = visitanteId.replace(/^temp_/, '');
  const filename = `${cleanId}_${timestamp}.jpg`;
  const thumbFilename = `${cleanId}_${timestamp}_thumb.jpg`;
  const filePath = path.join(baseDir, filename);
  const thumbPath = path.join(baseDir, thumbFilename);
  
  // Obter metadados da imagem
  const metadata = await sharp(imageBuffer).metadata();
  
  // Processar imagem principal (400x400, mantendo proporção, crop central)
  await sharp(imageBuffer)
    .resize(400, 400, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 85 })
    .toFile(filePath);
  
  // Processar thumbnail (150x150)
  await sharp(imageBuffer)
    .resize(150, 150, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 85 })
    .toFile(thumbPath);
  
  // Caminho relativo para salvar no banco
  const relativePath = `/uploads/${tipo}/${year}/${month}/${filename}`;
  const relativeThumbPath = `/uploads/${tipo}/${year}/${month}/${thumbFilename}`;
  
  return {
    path: relativePath,
    thumbnailPath: relativeThumbPath,
    dimensoes: {
      largura: 400,
      altura: 400
    },
    tamanho: fs.statSync(filePath).size
  };
}

/**
 * Valida tipo de imagem
 */
function validarTipoImagem(mimetype) {
  const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return tiposPermitidos.includes(mimetype);
}

/**
 * Valida tamanho do arquivo
 */
function validarTamanhoArquivo(size) {
  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5242880; // 5MB
  return size <= maxSize;
}

module.exports = {
  processarImagemVisitante,
  validarTipoImagem,
  validarTamanhoArquivo,
};
