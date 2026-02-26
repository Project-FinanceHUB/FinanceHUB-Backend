# Supabase – FinanceHUB

## Migrations

As migrations em `migrations/` devem ser aplicadas no projeto Supabase (produção ou staging).

### Como aplicar

1. **Pelo Dashboard do Supabase**
   - Abra o projeto → **SQL Editor**.
   - Copie o conteúdo do arquivo da migration (ex.: `009_enable_rls_public.sql`).
   - Cole no editor e execute **Run**.

2. **Pela CLI (se configurada)**
   - No diretório do backend: `npx supabase db push` (ou o comando que você usa para aplicar migrations).

### Migration 009 – RLS (Security Advisor)

A migration `009_enable_rls_public.sql` habilita **Row Level Security (RLS)** em todas as tabelas do schema `public` que o Security Advisor apontava como “RLS Disabled in Public” e “Sensitive Columns Exposed”.

- O **backend** usa `SUPABASE_SERVICE_KEY` (service_role), que **ignora RLS**, então a API continua funcionando normalmente.
- O acesso **direto** à API REST do Supabase com chave `anon` ou `authenticated` fica bloqueado até que políticas sejam criadas (se um dia o frontend passar a usar o cliente Supabase diretamente).

Depois de aplicar a migration, no **Security Advisor** do Supabase use **Reset suggestions** para a análise ser refeita e os erros sumirem.
