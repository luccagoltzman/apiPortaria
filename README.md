# Sistema de Portaria Digital - Backend API

Backend para gerenciamento de portarias automatizadas em **prédios comerciais**. O sistema automatiza o processo de entrada/saída de visitantes através de escaneamento de documentos (CNH/RG) e captura de foto facial.

## 🚀 Tecnologias

- **Node.js** com Express
- **Prisma ORM** com MySQL
- **JWT** para autenticação
- **Zod** para validação
- **Multer** para upload de arquivos
- **Sharp** para processamento de imagens
- **bcrypt** para hash de senhas

## 📋 Pré-requisitos

- Node.js 18+ 
- MySQL 8.0+
- npm ou yarn

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd apiPortaria
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
DATABASE_URL="mysql://usuario:senha@localhost:3306/portaria"
JWT_SECRET="sua-chave-secreta-aqui"
JWT_REFRESH_SECRET="sua-chave-refresh-aqui"
```

4. Configure o banco de dados:
```bash
# Gerar cliente Prisma
npm run prisma:generate

# Executar migrações
npm run prisma:migrate

# Popular com dados iniciais (usuário admin)
npm run prisma:seed
```

5. Inicie o servidor:
```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

O servidor estará rodando em `http://localhost:3000`

## 👤 Usuários Padrão

Após executar o seed, os seguintes usuários são criados:

- **Admin**: 
  - Email: `admin@portaria.com`
  - Senha: `admin123`
  
- **Porteiro**:
  - Email: `porteiro@portaria.com`
  - Senha: `admin123`

⚠️ **IMPORTANTE**: Altere as senhas após o primeiro acesso!

## 📚 Documentação da API

### Autenticação

#### POST /api/auth/login
```json
{
  "email": "admin@portaria.com",
  "senha": "admin123"
}
```

Resposta:
```json
{
  "data": {
    "token": "jwt_token",
    "refreshToken": "refresh_token",
    "usuario": {
      "id": "uuid",
      "nome": "Administrador",
      "email": "admin@portaria.com",
      "tipo": "ADMIN"
    }
  }
}
```

### Endpoints Principais

#### Visitantes
- `GET /api/visitantes` - Listar visitantes
- `GET /api/visitantes/:id` - Buscar por ID
- `GET /api/visitantes/buscar/:cpf` - Buscar por CPF
- `POST /api/visitantes` - Criar visitante (com foto obrigatória)
- `PUT /api/visitantes/:id` - Atualizar visitante
- `DELETE /api/visitantes/:id` - Deletar visitante

#### Registros de Entrada/Saída
- `GET /api/registros` - Listar registros
- `GET /api/registros/:id` - Buscar por ID
- `GET /api/registros/estatisticas` - Estatísticas
- `POST /api/registros/entrada` - Registrar entrada (com foto obrigatória)
- `PUT /api/registros/:id/saida` - Registrar saída

#### Upload de Fotos
- `POST /api/upload/foto` - Upload e processamento de foto

#### OCR (Processamento de Documentos)
- `POST /api/ocr/processar` - Processar imagem de documento (CNH/RG)

#### Blacklist
- `GET /api/blacklist` - Listar blacklist
- `POST /api/blacklist` - Adicionar à blacklist
- `DELETE /api/blacklist/:id` - Remover da blacklist
- `GET /api/blacklist/verificar/:cpf` - Verificar CPF

## 🔐 Autenticação

A maioria dos endpoints requer autenticação. Inclua o token no header:

```
Authorization: Bearer <seu_token_jwt>
```

## 📝 Permissões

- **ADMIN**: Acesso total ao sistema
- **PORTEIRO**: Pode criar/ler registros, buscar pessoas, fazer upload de fotos

## 📸 Processamento de Imagens

O sistema processa automaticamente todas as imagens enviadas:

- **Redimensionamento**: 400x400px (mantendo proporção, crop central)
- **Thumbnail**: 150x150px para listagens
- **Formato**: JPEG com qualidade 85%
- **Estrutura**: Organizado por ano/mês (`uploads/visitantes/2024/01/`)
- **Tamanho máximo**: 5MB

## 🗄️ Estrutura do Banco de Dados

O sistema utiliza Prisma ORM com MySQL. Os principais modelos são:

- `Usuario` - Usuários do sistema (admin, porteiro)
- `Visitante` - Visitantes cadastrados
- `RegistroVisita` - Registros de entrada/saída
- `Blacklist` - Lista de CPFs bloqueados

## 🧪 Testes

```bash
npm test
```

## 📦 Scripts Disponíveis

- `npm run dev` - Inicia servidor em modo desenvolvimento
- `npm start` - Inicia servidor em produção
- `npm run prisma:generate` - Gera cliente Prisma
- `npm run prisma:migrate` - Executa migrações
- `npm run prisma:studio` - Abre Prisma Studio
- `npm run prisma:seed` - Popula banco com dados iniciais

## 🔒 Segurança

- Validação de CPF brasileiro
- Hash de senhas com bcrypt
- JWT com refresh tokens
- Rate limiting
- Validação de dados com Zod
- Verificação de blacklist antes de permitir entrada
- Validação de tipos de arquivo (apenas imagens)
- Processamento seguro de uploads

## 📁 Estrutura do Projeto

```
apiPortaria/
├── prisma/
│   ├── schema.prisma      # Schema do banco de dados
│   └── seed.js            # Script de seed
├── src/
│   ├── config/
│   │   ├── database.js    # Configuração Prisma
│   │   └── upload.js      # Configuração Multer
│   ├── controllers/       # Controllers da API
│   ├── middlewares/        # Middlewares (auth, validação, etc)
│   ├── routes/            # Rotas da API
│   ├── services/         # Serviços de negócio
│   │   ├── imageService.js # Processamento de imagens
│   │   └── ...
│   ├── utils/             # Utilitários (validação CPF, etc)
│   └── server.js          # Servidor Express
├── uploads/              # Arquivos enviados (fotos)
│   ├── visitantes/
│   └── registros/
├── .env.example          # Exemplo de variáveis de ambiente
└── package.json
```

## 🐛 Troubleshooting

### Erro de conexão com banco
Verifique se o MySQL está rodando e se as credenciais no `.env` estão corretas.

### Erro de migração
Certifique-se de que o banco de dados existe:
```sql
CREATE DATABASE portaria CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Erro ao gerar Prisma Client
Execute:
```bash
npm run prisma:generate
```

### Erro ao processar imagens
Certifique-se de que a biblioteca Sharp está instalada:
```bash
npm install sharp
```

## 📄 Licença

ISC

## 👥 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.
