-- Performance Advisor: remove índices duplicados na tabela public.users.
-- "Duplicate Index" = dois ou mais índices nas mesmas colunas (redundantes).

-- Redundante com o índice criado pela constraint UNIQUE(email)
DROP INDEX IF EXISTS public.users_email_idx;

-- Se a tabela foi renomeada de "user" para "users", índices com nome antigo podem ter ficado
-- (duplicando users_role_idx e users_ativo_idx)
DROP INDEX IF EXISTS public.user_email_idx;
DROP INDEX IF EXISTS public.user_role_idx;
DROP INDEX IF EXISTS public.user_ativo_idx;
