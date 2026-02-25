-- Vínculo usuário ↔ empresa: permite que Gerentes e Usuários visualizem empresas às quais foram vinculados.
-- Administrador continua vendo todas as empresas que criou (company.user_id).
-- Gerente/Usuário veem empresas em que aparecem em user_company.

CREATE TABLE IF NOT EXISTS user_company (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_user_company_user_id ON user_company(user_id);
CREATE INDEX IF NOT EXISTS idx_user_company_company_id ON user_company(company_id);

COMMENT ON TABLE user_company IS 'Vincula usuários (Gerente/Usuário) a empresas para visibilidade e operações';
