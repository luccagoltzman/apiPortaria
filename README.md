# Sistema de Portaria Digital - Backend API

Backend completo para gerenciamento de portarias automatizadas em condomínios comerciais e residenciais.

## 🚀 Tecnologias

- **Node.js** com Express
- **Prisma ORM** com MySQL
- **JWT** para autenticação
- **Zod** para validação
- **Multer** para upload de arquivos
- **QRCode** para geração de códigos QR

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

# Popular banco com dados iniciais (cria usuário admin)
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
  "token": "jwt_token",
  "refreshToken": "refresh_token",
  "usuario": {
    "id": "uuid",
    "nome": "Administrador",
    "email": "admin@portaria.com",
    "tipo": "ADMIN"
  }
}
```

#### POST /api/auth/refresh
```json
{
  "refreshToken": "refresh_token"
}
```

### Endpoints Principais

#### Visitantes
- `GET /api/visitantes` - Listar visitantes
- `GET /api/visitantes/:id` - Buscar por ID
- `GET /api/visitantes/buscar/:cpf` - Buscar por CPF
- `POST /api/visitantes` - Criar visitante
- `PUT /api/visitantes/:id` - Atualizar visitante
- `DELETE /api/visitantes/:id` - Deletar visitante

#### Registros de Entrada/Saída
- `GET /api/registros` - Listar registros
- `GET /api/registros/:id` - Buscar por ID
- `GET /api/registros/estatisticas` - Estatísticas
- `POST /api/registros/entrada` - Registrar entrada
- `PUT /api/registros/:id/saida` - Registrar saída

#### Moradores
- `GET /api/moradores` - Listar moradores
- `GET /api/moradores/:id` - Buscar por ID
- `POST /api/moradores` - Criar morador
- `PUT /api/moradores/:id` - Atualizar morador
- `DELETE /api/moradores/:id` - Deletar morador

#### Agendamentos
- `GET /api/agendamentos` - Listar agendamentos
- `GET /api/agendamentos/:id` - Buscar por ID
- `POST /api/agendamentos` - Criar agendamento
- `PUT /api/agendamentos/:id` - Atualizar agendamento
- `DELETE /api/agendamentos/:id` - Deletar agendamento
- `POST /api/agendamentos/:id/gerar-qrcode` - Gerar QR Code

#### QR Code
- `POST /api/qrcode/gerar` - Gerar QR Code
- `POST /api/qrcode/validar` - Validar QR Code

#### Blacklist
- `GET /api/blacklist` - Listar blacklist
- `POST /api/blacklist` - Adicionar à blacklist
- `DELETE /api/blacklist/:id` - Remover da blacklist
- `GET /api/blacklist/verificar/:cpf` - Verificar CPF

#### Prestadores
- `GET /api/prestadores` - Listar prestadores
- `POST /api/prestadores` - Criar prestador

#### Notificações
- `GET /api/notificacoes` - Listar notificações
- `PUT /api/notificacoes/:id/lida` - Marcar como lida
- `POST /api/notificacoes/enviar` - Enviar notificação

## 🔐 Autenticação

A maioria dos endpoints requer autenticação. Inclua o token no header:

```
Authorization: Bearer <seu_token_jwt>
```

## 📝 Permissões

- **ADMIN**: Acesso total ao sistema
- **PORTEIRO**: Pode criar/ler registros, buscar pessoas
- **MORADOR**: Apenas leitura de seus próprios dados

## 🗄️ Estrutura do Banco de Dados

O sistema utiliza Prisma ORM com MySQL. Os principais modelos são:

- `Usuario` - Usuários do sistema (admin, porteiro, morador)
- `Pessoa` - Dados base de pessoas
- `Visitante` - Visitantes cadastrados
- `Morador` - Moradores do condomínio
- `Prestador` - Prestadores de serviço
- `RegistroVisita` - Registros de entrada/saída
- `Agendamento` - Agendamentos de visitas
- `Blacklist` - Lista de CPFs bloqueados
- `Notificacao` - Notificações para moradores

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
│   ├── controllers/      # Controllers da API
│   ├── middlewares/       # Middlewares (auth, validação, etc)
│   ├── routes/           # Rotas da API
│   ├── services/         # Serviços de negócio
│   ├── utils/            # Utilitários (validação CPF, etc)
│   └── server.js         # Servidor Express
├── uploads/             # Arquivos enviados (fotos)
├── .env.example      # Exemplo de variáveis de ambiente
└── package.json
```

## 🐛 Troubleshooting

### Erro de conexão com banco
Verifique se o MySQL está rodando e se as credenciais no `.env` estão corretas.

### Erro de migração
Certifique-se de que o banco de dados existe:
```sql
CREATE DATABASE portaria;
```

### Erro ao gerar Prisma Client
Execute:
```bash
npm run prisma:generate
```

## 📄 Licença

ISC

## 👥 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.
