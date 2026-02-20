-- Adiciona telefone e cargo à tabela users para perfil do usuário
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS cargo TEXT;
