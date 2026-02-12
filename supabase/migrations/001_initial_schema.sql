-- FinanceHUB - Schema inicial para Supabase (PostgreSQL)
-- Pode ser executado várias vezes: usa IF NOT EXISTS para não falhar se já existir.

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela: company
CREATE TABLE IF NOT EXISTS company (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  cnpjs TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS company_nome_idx ON company(nome);

-- Tabela: users (evita palavra reservada "user" do PostgreSQL)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'usuario',
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultimo_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_role_idx ON users(role);
CREATE INDEX IF NOT EXISTS users_ativo_idx ON users(ativo);

-- Tabela: auth_code
CREATE TABLE IF NOT EXISTS auth_code (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_code_email_idx ON auth_code(email);
CREATE INDEX IF NOT EXISTS auth_code_code_idx ON auth_code(code);
CREATE INDEX IF NOT EXISTS auth_code_expires_at_idx ON auth_code(expires_at);
CREATE INDEX IF NOT EXISTS auth_code_used_idx ON auth_code(used);

-- Tabela: session
CREATE TABLE IF NOT EXISTS session (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS session_user_id_idx ON session(user_id);
CREATE INDEX IF NOT EXISTS session_token_idx ON session(token);
CREATE INDEX IF NOT EXISTS session_expires_at_idx ON session(expires_at);

-- Tabela: solicitacao
CREATE TABLE IF NOT EXISTS solicitacao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  origem TEXT NOT NULL,
  prioridade TEXT NOT NULL DEFAULT 'media',
  status TEXT NOT NULL DEFAULT 'aberto',
  estagio TEXT NOT NULL DEFAULT 'Pendente',
  descricao TEXT,
  mensagem TEXT,
  boleto_path TEXT,
  nota_fiscal_path TEXT,
  visualizado BOOLEAN NOT NULL DEFAULT false,
  visualizado_em TIMESTAMPTZ,
  respondido BOOLEAN NOT NULL DEFAULT false,
  respondido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS solicitacao_numero_idx ON solicitacao(numero);
CREATE INDEX IF NOT EXISTS solicitacao_status_idx ON solicitacao(status);
CREATE INDEX IF NOT EXISTS solicitacao_created_at_idx ON solicitacao(created_at);
CREATE INDEX IF NOT EXISTS solicitacao_visualizado_idx ON solicitacao(visualizado);
CREATE INDEX IF NOT EXISTS solicitacao_respondido_idx ON solicitacao(respondido);

-- Tabela: mensagem
CREATE TABLE IF NOT EXISTS mensagem (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  solicitacao_id UUID REFERENCES solicitacao(id) ON DELETE CASCADE,
  direcao TEXT NOT NULL,
  assunto TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  remetente TEXT NOT NULL,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
  lida BOOLEAN NOT NULL DEFAULT false,
  anexo TEXT
);
CREATE INDEX IF NOT EXISTS mensagem_solicitacao_id_idx ON mensagem(solicitacao_id);
CREATE INDEX IF NOT EXISTS mensagem_data_hora_idx ON mensagem(data_hora);
CREATE INDEX IF NOT EXISTS mensagem_lida_idx ON mensagem(lida);

-- Função e triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS company_updated_at ON company;
CREATE TRIGGER company_updated_at
  BEFORE UPDATE ON company
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

DROP TRIGGER IF EXISTS solicitacao_updated_at ON solicitacao;
CREATE TRIGGER solicitacao_updated_at
  BEFORE UPDATE ON solicitacao
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
