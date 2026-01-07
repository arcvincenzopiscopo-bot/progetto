/**
 * VERSIONE SEMPLIFICATA - Test RLS Login
 *
 * Questa versione semplificata spiega passo-passo cosa succede.
 * E' identica allo script complesso ma con più commenti.
 */

// 1. IMPORT E CONFIGURAZIONE
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Stessa configurazione del tuo progetto React
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Se non hai le variabili, usa valori di esempio per test
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log('❌ Manca configurazione. Aggiungi al file .env:');
  console.log('REACT_APP_SUPABASE_URL=https://xxx.supabase.co');
  console.log('REACT_APP_SUPABASE_ANON_KEY=eyJ...');
  process.exit(1);
}

// 2. CREA CONNESSIONE DATABASE
// Questo è lo stesso client che usa la tua app React
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
console.log('🔌 Connesso a Supabase:', SUPABASE_URL);

// 3. FUNZIONE PER OTTENERE IP (opzionale)
async function getUserIP() {
  try {
    // Chiama servizio esterno per ottenere IP pubblico
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'unknown';
  } catch (error) {
    return 'unknown'; // Fallback se fallisce
  }
}

// 4. FUNZIONE PER SALVARE LOG DEL LOGIN
async function salvaLogLogin(username) {
  try {
    const ip = await getUserIP();
    console.log(`📝 Salvo log: ${username} ha fatto login da IP ${ip}`);

    // Inserisce record nella tabella log_login
    const { error } = await supabase
      .from('log_login')
      .insert([{
        username: username,
        ip: ip,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.log('⚠️ Errore nel salvare log:', error.message);
    } else {
      console.log('✅ Log salvato correttamente');
    }
  } catch (err) {
    console.log('⚠️ Errore in salvaLogLogin:', err.message);
  }
}

// 5. FUNZIONE DI LOGIN PRINCIPALE
// Questa è COPIA ESATTA della logica del tuo sistema,
// ma usa tabella "users_secure" invece di "users"
async function loginConUsersSecure(username, password) {
  console.log(`🔐 TENTO LOGIN per utente: ${username}`);

  try {
    // PASSO 1: Cerca utente nella tabella users_secure
    console.log('   📋 Cerco utente in tabella users_secure...');
    const { data: utente, error } = await supabase
      .from('users_secure')  // <-- Qui usa users_secure invece di users
      .select('*')
      .eq('username', username)
      .single();  // Prendi solo un record

    // Se query fallisce
    if (error) {
      console.log('   ❌ Errore database:', error.message);
      return null;
    }

    // Se utente non trovato
    if (!utente) {
      console.log('   ❌ Utente non trovato in users_secure');
      return null;
    }

    console.log('   ✅ Utente trovato:', utente.username);

    // PASSO 2: Verifica password
    console.log('   🔒 Verifico password...');
    if (utente.password !== password) {
      console.log('   ❌ Password sbagliata');
      return null;
    }

    console.log('   ✅ Password corretta!');

    // PASSO 3: Salva log del login (come nel sistema reale)
    await salvaLogLogin(username);

    // PASSO 4: Ritorna dati utente (come nel sistema reale)
    console.log('   🎉 LOGIN RIUSCITO!');
    return {
      id: utente.id,
      username: utente.username,
      team: utente.team,
      admin: utente.admin
    };

  } catch (errore) {
    console.log('   💥 Errore imprevisto:', errore.message);
    return null;
  }
}

// 6. FUNZIONE DI TEST
async function eseguiTest() {
  console.log('\n🧪 === INIZIO TEST RLS LOGIN ===\n');

  // TEST 1: Verifica connessione database
  console.log('TEST 1: Verifica connessione a users_secure');
  try {
    const { data, error } = await supabase
      .from('users_secure')
      .select('count')
      .limit(1);

    if (error) {
      console.log('❌ Errore connessione:', error.message);
      console.log('💡 Hai creato la tabella users_secure?');
      console.log('   SQL: CREATE TABLE users_secure AS SELECT * FROM users;');
      return;
    }
    console.log('✅ Connessione OK - tabella users_secure accessibile\n');
  } catch (err) {
    console.log('❌ Errore connessione:', err.message);
    return;
  }

  // TEST 2: Prova login con dati di esempio
  console.log('TEST 2: Prova login\n');

  // Qui dovrai sostituire con dati reali dalla tua tabella
  const testUtenti = [
    { username: 'admin', password: 'admin123', descrizione: 'Amministratore' },
    { username: 'test', password: 'test123', descrizione: 'Utente normale' }
  ];

  for (let i = 0; i < testUtenti.length; i++) {
    const utente = testUtenti[i];
    console.log(`${i + 1}. Test login: ${utente.descrizione}`);
    console.log(`   Username: ${utente.username}`);

    const risultato = await loginConUsersSecure(utente.username, utente.password);

    if (risultato) {
      console.log('   ✅ SUCCESSO!');
      console.log(`   👤 ID: ${risultato.id}, Admin: ${risultato.admin}`);
    } else {
      console.log('   ❌ FALLITO - controlla username/password');
      console.log('   💡 Modifica i dati in testUtenti[] con valori reali');
    }
    console.log('');
  }

  console.log('🎯 === FINE TEST ===\n');
  console.log('💡 PROSSIMI PASSI per RLS:');
  console.log('   1. Nel dashboard Supabase, vai a SQL Editor');
  console.log('   2. Copia contenuto di rls-setup-example.sql');
  console.log('   3. Esegui per abilitare RLS');
  console.log('   4. Rer esegui questo script per vedere differenze');
}

// 7. AVVIA SCRIPT
console.log('🚀 AVVIO SCRIPT TEST RLS LOGIN\n');
eseguiTest().catch(console.error);
