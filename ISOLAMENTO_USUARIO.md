# Isolamento por usuário (empresas e solicitações)

Cada usuário deve ver **apenas** suas próprias empresas e solicitações. Para isso funcionar:

## 1. Migrations no Supabase

As colunas `user_id` precisam existir nas tabelas. No **Supabase Dashboard** → **SQL Editor**, execute (se ainda não rodou):

- Conteúdo de `supabase/migrations/006_company_user_id.sql`
- Conteúdo de `supabase/migrations/007_solicitacao_user_id.sql`

Ou rode as migrations pelo CLI do Supabase no projeto.

## 2. Backend em produção

O backend que está no ar deve ser a versão que:

- Usa `requireAuth` em **todas** as rotas de `/api/companies` e `/api/solicitacoes`
- Em **todos** os métodos de `company.service` e `solicitacao.service` filtra (ou preenche) por `user_id` usando o `userId` de `req.user.id`

Se o servidor em produção for uma versão antiga (sem filtro por usuário), todos continuarão vendo dados de todos.

## 3. Frontend em produção

O frontend deve enviar o **token** em todas as chamadas de empresas e solicitações:

- Header: `Authorization: Bearer <token>`
- Ao trocar de usuário ou fazer logout, empresas e solicitações são limpas imediatamente (e o cache local de empresas removido)

## 4. Dados antigos (user_id NULL)

Registros criados **antes** das migrations podem ter `user_id` NULL. Eles **não** entram na listagem (o backend filtra `.eq('user_id', userId)`). Para vinculá-los a um usuário, é preciso atualizar no SQL, por exemplo:

```sql
-- Exemplo: atribuir todas as empresas sem dono ao usuário com id 'xxx'
UPDATE company SET user_id = 'uuid-do-usuario' WHERE user_id IS NULL;

-- Exemplo: atribuir todas as solicitações sem dono ao usuário com id 'xxx'
UPDATE solicitacao SET user_id = 'uuid-do-usuario' WHERE user_id IS NULL;
```

## Resumo

- **Backend**: já filtra empresas e solicitações por `req.user.id`.
- **Frontend**: envia token e limpa dados ao trocar usuário/logout.
- **Você precisa**: rodar as migrations 006 e 007 no Supabase (se ainda não rodou) e garantir que o backend e o frontend em produção são as versões atuais.
