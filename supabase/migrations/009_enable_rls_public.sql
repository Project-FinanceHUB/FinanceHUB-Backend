-- Security Advisor: habilita RLS em todas as tabelas do schema public
-- expostas ao PostgREST, corrigindo "RLS Disabled in Public" e "Sensitive Columns Exposed".
-- O backend usa SUPABASE_SERVICE_KEY (service_role), que ignora RLS; o acesso via API continua igual.
-- Acesso direto à API com anon/authenticated fica bloqueado até que políticas sejam criadas (se necessário).

ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_company ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.auth_code ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.session ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.solicitacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.mensagem ENABLE ROW LEVEL SECURITY;

-- Políticas: sem políticas permissivas para anon/authenticated, o acesso direto via PostgREST
-- (anon key) fica negado. O backend (service_role) não é afetado.
-- Se no futuro o frontend precisar acessar o Supabase diretamente com anon/authenticated,
-- adicione políticas específicas aqui (ex.: SELECT apenas para o próprio usuário).

COMMENT ON TABLE public.users IS 'RLS ativado; acesso apenas via backend (service_role) ou políticas futuras';
COMMENT ON TABLE public.session IS 'RLS ativado; dados sensíveis protegidos';
COMMENT ON TABLE public.auth_code IS 'RLS ativado; códigos de verificação protegidos';
