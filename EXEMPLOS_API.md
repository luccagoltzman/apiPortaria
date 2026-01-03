# Exemplos de Uso da API

Este documento contém exemplos práticos de como usar a API do Sistema de Portaria Digital.

## Autenticação

### 1. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@portaria.com",
    "senha": "admin123"
  }'
```

Resposta:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": "uuid",
    "nome": "Administrador",
    "email": "admin@portaria.com",
    "tipo": "ADMIN"
  }
}
```

### 2. Usar Token nas Requisições

```bash
curl -X GET http://localhost:3000/api/visitantes \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

## Visitantes

### Criar Visitante

```bash
curl -X POST http://localhost:3000/api/visitantes \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "nome=João Silva" \
  -F "cpf=12345678901" \
  -F "telefone=(11) 98765-4321" \
  -F "tipo=VISITA" \
  -F "apartamento=101" \
  -F "foto=@/caminho/para/foto.jpg"
```

### Buscar Visitante por CPF

```bash
curl -X GET http://localhost:3000/api/visitantes/buscar/12345678901 \
  -H "Authorization: Bearer SEU_TOKEN"
```

## Registros de Entrada/Saída

### Registrar Entrada

```bash
curl -X POST http://localhost:3000/api/registros/entrada \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "visitanteId": "uuid-do-visitante",
    "apartamento": "101",
    "tipo": "VISITA",
    "metodoEntrada": "DOCUMENTO",
    "observacoes": "Visitante autorizado pelo morador"
  }'
```

### Registrar Saída

```bash
curl -X PUT http://localhost:3000/api/registros/UUID_DO_REGISTRO/saida \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "observacoes": "Saída normal"
  }'
```

### Estatísticas

```bash
curl -X GET "http://localhost:3000/api/registros/estatisticas?periodo=hoje" \
  -H "Authorization: Bearer SEU_TOKEN"
```

## Moradores

### Criar Morador

```bash
curl -X POST http://localhost:3000/api/moradores \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Maria Santos",
    "cpf": "98765432100",
    "apartamento": "101",
    "bloco": "A",
    "tipoUnidade": "APARTAMENTO",
    "telefone": "(11) 98765-4321",
    "email": "maria@example.com",
    "dataEntrada": "2024-01-01"
  }'
```

## Agendamentos

### Criar Agendamento

```bash
curl -X POST http://localhost:3000/api/agendamentos \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nomeVisitante": "João Silva",
    "cpfVisitante": "12345678901",
    "telefone": "(11) 98765-4321",
    "apartamento": "101",
    "moradorId": "uuid-do-morador",
    "dataHora": "2024-12-25T14:00:00",
    "tipo": "VISITA",
    "observacoes": "Visita familiar"
  }'
```

### Gerar QR Code para Agendamento

```bash
curl -X POST http://localhost:3000/api/agendamentos/UUID_DO_AGENDAMENTO/gerar-qrcode \
  -H "Authorization: Bearer SEU_TOKEN"
```

## QR Code

### Gerar QR Code

```bash
curl -X POST http://localhost:3000/api/qrcode/gerar \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "visitanteId": "uuid-do-visitante"
  }'
```

### Validar QR Code

```bash
curl -X POST http://localhost:3000/api/qrcode/validar \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qrcodeData": {
      "id": "uuid",
      "tipo": "VISITANTE",
      "visitanteId": "uuid",
      "timestamp": 1234567890,
      "validade": 1234567890
    }
  }'
```

## Blacklist

### Adicionar à Blacklist

```bash
curl -X POST http://localhost:3000/api/blacklist \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cpf": "12345678901",
    "nome": "João Silva",
    "motivo": "Tentativa de entrada não autorizada"
  }'
```

### Verificar CPF na Blacklist

```bash
curl -X GET http://localhost:3000/api/blacklist/verificar/12345678901 \
  -H "Authorization: Bearer SEU_TOKEN"
```

## Notificações

### Listar Notificações

```bash
curl -X GET "http://localhost:3000/api/notificacoes?moradorId=uuid&lida=false" \
  -H "Authorization: Bearer SEU_TOKEN"
```

### Marcar como Lida

```bash
curl -X PUT http://localhost:3000/api/notificacoes/UUID_DA_NOTIFICACAO/lida \
  -H "Authorization: Bearer SEU_TOKEN"
```

## Exemplos com JavaScript (Fetch API)

### Login e Usar Token

```javascript
// Login
const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@portaria.com',
    senha: 'admin123',
  }),
});

const { token, usuario } = await loginResponse.json();

// Usar token em requisições
const visitantesResponse = await fetch('http://localhost:3000/api/visitantes', {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const { data } = await visitantesResponse.json();
console.log(data);
```

### Criar Visitante com Foto

```javascript
const formData = new FormData();
formData.append('nome', 'João Silva');
formData.append('cpf', '12345678901');
formData.append('telefone', '(11) 98765-4321');
formData.append('tipo', 'VISITA');
formData.append('apartamento', '101');
formData.append('foto', fileInput.files[0]); // Arquivo de input

const response = await fetch('http://localhost:3000/api/visitantes', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});

const result = await response.json();
```

## Códigos de Erro Comuns

- `400` - Bad Request (dados inválidos)
- `401` - Não autenticado (token inválido ou ausente)
- `403` - Sem permissão (usuário não tem permissão para a ação)
- `404` - Não encontrado (recurso não existe)
- `409` - Conflito (ex: CPF já cadastrado)
- `422` - Erro de validação (dados não passaram na validação)
- `500` - Erro interno do servidor

## Paginação

A maioria dos endpoints de listagem suporta paginação:

```
GET /api/visitantes?page=1&limit=20&search=joão&status=DENTRO
```

Parâmetros:
- `page` - Número da página (padrão: 1)
- `limit` - Itens por página (padrão: 20, máximo: 100)
- `search` - Busca por nome ou CPF
- Outros filtros específicos por endpoint
