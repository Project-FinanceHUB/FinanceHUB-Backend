-- Hierarquia Gerente > Funcionário: funcionários vinculados ao gerente veem as mesmas empresas e solicitações.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS gerente_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS users_gerente_id_idx ON users(gerente_id);

COMMENT ON COLUMN users.gerente_id IS 'Se preenchido, usuário é funcionário deste gerente e compartilha a visão (empresas/solicitações).';
