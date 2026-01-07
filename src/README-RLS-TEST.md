# 🛡️ Test RLS (Row Level Security) Implementation

Questo documento spiega come utilizzare lo script `test-rls-login.js` per testare l'implementazione di RLS senza interrompere il sistema di produzione.

## 📋 Panoramica

Lo script `test-rls-login.js` replica esattamente la logica di login del sistema principale, ma opera sulla tabella `users_secure` invece che su `users`. Questo permette di:

- Testare policy RLS senza rischi
- Sviluppare e raffinare regole di sicurezza
- Validare il funzionamento prima della migrazione

## 🚀 Utilizzo

### 1. Preparazione

Assicurati che la tabella `users_secure` esista e contenga dati di test:

```sql
-- Copia struttura e dati dalla tabella users
CREATE TABLE users_secure AS SELECT * FROM users;

-- Verifica contenuti
SELECT COUNT(*) FROM users_secure;
```

### 2. Esecuzione dello Script

```bash
# Dal root del progetto
node src/test-rls-login.js
```

O con variabili d'ambiente esplicite:

```bash
REACT_APP_SUPABASE_URL=https://your-project.supabase.co \
REACT_APP_SUPABASE_ANON_KEY=your-anon-key \
node src/test-rls-login.js
```

### 3. Output Atteso

```
🧪 === TEST RLS LOGIN SYSTEM ===

📍 Database URL: https://your-project.supabase.co
🔑 Using Anon Key: eyJhbGciOiJIUzI1NiIs...

🔍 Test connessione database...
✅ Connessione database OK

🧪 === ESECUZIONE TEST ===

1. Login valido - utente normale
   🔐 Tentativo login per: testuser
   ✅ Utente trovato: { id: '123', username: 'testuser' }
   ✅ Password verificata con successo
   🌐 Recupero IP utente...
   📝 Logging login per testuser da IP 192.168.1.1
   ✅ Login logged con successo
   🎉 Login completato con successo!
   ✅ SUCCESSO - Login riuscito
   📊 User Data: ID=123, Admin=0, Team=team1
```

## 🔧 Configurazione RLS

### Abilitare RLS sulla tabella users_secure

```sql
-- Abilita RLS
ALTER TABLE users_secure ENABLE ROW LEVEL SECURITY;

-- Policy di base per lettura (login)
CREATE POLICY "users_secure_login_policy" ON users_secure
  FOR SELECT USING (true);

-- Policy per impedire modifiche non autorizzate
CREATE POLICY "users_secure_no_updates" ON users_secure
  FOR ALL USING (false);
```

### Policy Avanzate con Context

```sql
-- Funzione helper per ottenere user_id dal context
CREATE OR REPLACE FUNCTION auth.get_current_user_id()
RETURNS TEXT AS $$
  SELECT nullif(current_setting('request.user_id', true), '');
$$ LANGUAGE sql SECURITY DEFINER;

-- Policy basata su user_id passato come parametro
CREATE POLICY "users_secure_user_policy" ON users_secure
  FOR SELECT USING (
    auth.get_current_user_id()::text = id::text OR
    admin >= 1 -- Admin può vedere tutti
  );
```

### Policy per tabella log_login

```sql
-- Abilita RLS su log_login
ALTER TABLE log_login ENABLE ROW LEVEL SECURITY;

-- Solo insert permesso (nessuna lettura)
CREATE POLICY "log_login_insert_only" ON log_login
  FOR INSERT WITH CHECK (true);

CREATE POLICY "log_login_no_select" ON log_login
  FOR SELECT USING (false);
```

## 🧪 Test Cases

Lo script esegue automaticamente questi test:

1. **Login valido - utente normale**
2. **Login valido - amministratore**
3. **Login fallito - password errata**
4. **Login fallito - utente non esistente**

## 🔄 Migrazione al Sistema Principale

Una volta testato e funzionante su `users_secure`:

### 1. Backup
```sql
-- Backup tabella esistente
CREATE TABLE users_backup AS SELECT * FROM users;
```

### 2. Abilita RLS su tabella principale
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Applica le stesse policy testate
```

### 3. Aggiorna Codice Frontend
Modifica `authService.ts` per usare le nuove policy RLS.

### 4. Test di Produzione
Esegui test completi sul sistema principale.

## ⚠️ Sicurezza

- **NON eseguire** questo script in produzione senza aver testato RLS
- **Mantieni** `users_secure` separata dal sistema di produzione
- **Verifica** che le policy RLS blocchino accessi non autorizzati

## 📞 Supporto

In caso di problemi:
1. Verifica connessione database
2. Controlla che `users_secure` contenga dati
3. Verifica variabili d'ambiente
4. Controlla log Supabase per errori RLS
