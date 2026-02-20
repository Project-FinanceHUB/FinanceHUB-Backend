-- Vincula empresas ao usuário: cada usuário vê apenas suas próprias empresas.
ALTER TABLE company
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS company_user_id_idx ON company(user_id);

COMMENT ON COLUMN company.user_id IS 'Proprietário da empresa; listagem e ações filtradas por este usuário.';
