-- Se você já executou 001_initial_schema.sql com a tabela "user",
-- execute este script no SQL Editor do Supabase para renomear para "users".
-- (O PostgREST/Supabase não expõe bem tabelas com nome reservado "user".)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user'
  ) THEN
    ALTER TABLE "user" RENAME TO users;
    -- Trigger antigo tinha nome user_updated_at; recriar com nome users_updated_at
    DROP TRIGGER IF EXISTS user_updated_at ON users;
    CREATE TRIGGER users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
  END IF;
END $$;
