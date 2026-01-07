/**
 * TEST INTERATTIVO LOGIN RLS
 *
 * Questo script simula ESATTAMENTE il tuo form di login:
 * - Chiede username e password
 * - Cerca in tabella users_secure (come il tuo sistema usa users)
 * - Verifica password
 * - Mostra risultato login
 *
 * Serve per testare se RLS permette la lettura dalla tabella users_secure
 */

// Import necessari
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const readline = require('readline');

// Configurazione database (stessa del tuo progetto)
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.log('❌ Configurazione mancante. Aggiungi a .env:');
  console.log('REACT_APP_SUPABASE_URL=https://xxx.supabase.co');
  console.log('REACT_APP_SUPABASE_ANON_KEY=eyJ...');
  process.exit(1);
}

// Client Supabase (stesso del tuo progetto)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Interfaccia per input utente
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Funzione per chiedere input
function chiediInput(domanda) {
  return new Promise((resolve) => {
    rl.question(domanda, (risposta) => {
      resolve(risposta.trim());
    });
  });
}

// LOGICA DI LOGIN IDENTICA AL TUO PROGETTO
async function verificaLogin(username, password) {
  console.log(`🔐 Tentativo login per: ${username}`);

  try {
    // STESSA QUERY DEL TUO SISTEMA - ma su tabella users_secure
    console.log('📡 Query: SELECT * FROM users_secure WHERE username = ?');
    const { data: utente, error } = await supabase
      .from('users_secure')  // <-- TABella di test invece di users
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      console.log('❌ Errore query:', error.message);
      console.log('💡 Questo potrebbe indicare che RLS blocca la lettura!');
      return false;
    }

    if (!utente) {
      console.log('❌ Utente non trovato in users_secure');
      return false;
    }

    console.log('✅ Utente trovato, verifico password...');

    // STESSA VERIFICA PASSWORD DEL TUO SISTEMA
    if (utente.password !== password) {
      console.log('❌ Password errata');
      return false;
    }

    console.log('✅ Password corretta!');
    console.log('🎉 LOGIN RIUSCITO!');
    console.log('👤 Dati utente:', {
      id: utente.id,
      username: utente.username,
      team: utente.team,
      admin: utente.admin
    });

    return true;

  } catch (errore) {
    console.log('💥 Errore imprevisto:', errore.message);
    return false;
  }
}

// Funzione principale
async function avviaTestLogin() {
  console.log('\n🧪 === TEST LOGIN INTERATTIVO RLS ===\n');
  console.log('Questo script simula il tuo form di login');
  console.log('Usa tabella users_secure invece di users\n');

  // Verifica connessione tabella
  console.log('🔍 Verifico connessione a users_secure...');
  try {
    const { error } = await supabase
      .from('users_secure')
      .select('count')
      .limit(1);

    if (error) {
      console.log('❌ Errore connessione tabella users_secure');
      console.log('💡 Hai creato la tabella? SQL: CREATE TABLE users_secure AS SELECT * FROM users;');
      rl.close();
      return;
    }
    console.log('✅ Tabella users_secure accessibile\n');
  } catch (err) {
    console.log('❌ Errore connessione:', err.message);
    rl.close();
    return;
  }

  // Loop per test multipli
  let continua = true;
  while (continua) {
    console.log('📝 Inserisci credenziali per test login:\n');

    // Chiedi username
    const username = await chiediInput('Username: ');
    if (!username) {
      console.log('❌ Username obbligatorio');
      continue;
    }

    // Chiedi password
    const password = await chiediInput('Password: ');
    if (!password) {
      console.log('❌ Password obbligatoria');
      continue;
    }

    // Esegui login
    console.log('\n🚀 Eseguo login...\n');
    const successo = await verificaLogin(username, password);

    if (successo) {
      console.log('\n✅ LOGIN RIUSCITO - RLS permette lettura da users_secure');
    } else {
      console.log('\n❌ LOGIN FALLITO');
      console.log('💡 Possibili cause:');
      console.log('   - Credenziali errate');
      console.log('   - RLS blocca lettura da users_secure');
      console.log('   - Tabella vuota o dati non corrispondenti');
    }

    // Chiedi se continuare
    console.log('\n' + '='.repeat(50));
    const risposta = await chiediInput('Vuoi testare altre credenziali? (s/n): ');
    continua = risposta.toLowerCase() === 's' || risposta.toLowerCase() === 'si';
    console.log('');
  }

  console.log('👋 Test completato!');
  rl.close();
}

// Avvia test
console.log('🚀 Avvio test login RLS...\n');
avviaTestLogin().catch(console.error);
