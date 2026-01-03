-- Script para criar o banco de dados MySQL
-- Execute este script no MySQL antes de rodar as migrações

CREATE DATABASE IF NOT EXISTS portaria CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Opcional: Criar usuário específico para a aplicação
-- CREATE USER 'portaria_user'@'localhost' IDENTIFIED BY 'sua_senha_segura';
-- GRANT ALL PRIVILEGES ON portaria.* TO 'portaria_user'@'localhost';
-- FLUSH PRIVILEGES;
