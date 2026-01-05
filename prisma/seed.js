const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar usuário admin padrão
  const senhaHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@portaria.com' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@portaria.com',
      senha: senhaHash,
      tipo: 'ADMIN',
      ativo: true,
    },
  });

  console.log('✅ Usuário admin criado:', admin.email);
  console.log('   Senha padrão: admin123');
  console.log('   ⚠️  ALTERE A SENHA APÓS O PRIMEIRO ACESSO!');

  // Criar usuário porteiro de exemplo
  const porteiro = await prisma.usuario.upsert({
    where: { email: 'porteiro@portaria.com' },
    update: {},
    create: {
      nome: 'Porteiro',
      email: 'porteiro@portaria.com',
      senha: senhaHash,
      tipo: 'PORTEIRO',
      ativo: true,
    },
  });

  console.log('✅ Usuário porteiro criado:', porteiro.email);
  console.log('   Senha padrão: admin123');
  console.log('');
  console.log('⚠️  IMPORTANTE: Altere as senhas após o primeiro acesso!');
  console.log('✨ Seed concluído!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
