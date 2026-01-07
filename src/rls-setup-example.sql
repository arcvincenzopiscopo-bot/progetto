-- ===========================================
-- RLS SETUP EXAMPLE for users_secure table
-- ===========================================
-- Esegui questi comandi nel SQL Editor di Supabase
-- per abilitare RLS sulla tabella users_secure

-- 1. Abilita RLS sulla tabella users_secure
ALTER TABLE users_secure ENABLE ROW LEVEL SECURITY;

-- 2. Policy di base per permettere il login (lettura)
-- Questa policy permette a chiunque di leggere dalla tabella per verificare le credenziali
CREATE POLICY "users_secure_login_read" ON users_secure
  FOR SELECT USING (true);

-- 3. Policy per impedire modifiche non autorizzate
-- Nessuno può modificare, inserire o eliminare dalla tabella users_secure
CREATE POLICY "users_secure_no_modifications" ON users_secure
  FOR ALL USING (false);

-- 4. Abilita RLS anche su log_login (se vuoi testare il logging)
ALTER TABLE log_login ENABLE ROW LEVEL SECURITY;

CREATE POLICY "log_login_allow_insert" ON log_login
  FOR INSERT WITH CHECK (true);

CREATE POLICY "log_login_no_read" ON log_login
  FOR SELECT USING (false);

-- ===========================================
-- VERIFICA SETUP
-- ===========================================

-- Verifica che RLS sia abilitato
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('users_secure', 'log_login')
AND schemaname = 'public';

-- Verifica policy esistenti
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('users_secure', 'log_login')
AND schemaname = 'public';

-- ===========================================
-- TEST COMANDI
-- ===========================================

-- Questi comandi dovrebbero funzionare (lettura permessa dalla policy)
SELECT username FROM users_secure LIMIT 1;

-- Questi comandi dovrebbero fallire (modifiche bloccate)
-- UPDATE users_secure SET username = 'test' WHERE id = 'some-id';
-- DELETE FROM users_secure WHERE id = 'some-id';

-- ===========================================
-- POLICY AVANZATE (da testare dopo)
-- ===========================================

-- Esempio di policy più restrittiva (scommenta per testare)
-- DROP POLICY "users_secure_login_read" ON users_secure;
-- DROP POLICY "users_secure_no_modifications" ON users_secure;

-- Policy che permette lettura solo se viene fornito un user_id specifico
-- CREATE POLICY "users_secure_restricted_read" ON users_secure
--   FOR SELECT USING (
--     current_setting('request.user_id', true) = id::text OR
--     admin >= 1
--   );

-- Funzione helper per il context
-- CREATE OR REPLACE FUNCTION auth.get_current_user_id()
-- RETURNS TEXT AS $$
--   SELECT nullif(current_setting('request.user_id', true), '');
-- $$ LANGUAGE sql SECURITY DEFINER;
