-- Vincula solicitações ao usuário: cada usuário vê apenas suas próprias no Histórico.
ALTER TABLE solicitacao
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS solicitacao_user_id_idx ON solicitacao(user_id);

COMMENT ON COLUMN solicitacao.user_id IS 'Proprietário da solicitação; listagem e ações filtradas por este usuário.';
