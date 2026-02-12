-- Garante que auth_code e session existam (para migrações incompletas).
-- Execute no SQL Editor do Supabase se aparecer "table 'public.auth_code' not in schema cache".

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela auth_code (códigos de verificação por e-mail)
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

-- Tabela session (sessões de login) – depende de users existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
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
  END IF;
END $$;
