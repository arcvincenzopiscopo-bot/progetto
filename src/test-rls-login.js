/**
 * Test Script for RLS Implementation
 *
 * Questo script testa il sistema di login usando la tabella users_secure
 * senza interferire con il sistema di produzione esistente.
 *
 * Utilizzo:
 * node src/test-rls-login.js
 *
 * O con variabili d'ambiente:
 * REACT_APP_SUPABASE_URL=your_url REACT_APP_SUPABASE_ANON_KEY=your_key node src/test-rls-login.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configurazione Supabase (stessa del progetto principale)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Errore: Variabili d\'ambiente REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY richieste');
  console.log('💡 Imposta le variabili o cre un file .env');
  process.exit(1);
}

// Client Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Ottiene l'IP dell'utente (stessa funzione del sistema principale)
 */
const getUserIP = async () => {
  try {
    console.log('🌐 Recupero IP utente...');
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'unknown';
  } catch (error) {
    console.warn('⚠️ Impossibile ottenere IP:', error.message);
    return 'unknown';
  }
};

/**
 * Logga un evento di login nella tabella log_login
 * (Stessa logica del sistema principale)
 */
const logUserLogin = async (username) => {
  try {
    const ip = await getUserIP();
    console.log(`📝 Logging login per ${username} da IP ${ip}`);

    const { error } = await supabase
      .from('log_login')
      .insert([
        {
          username,
          ip,
          created_at: new Date().toISOString()
        }
      ]);

    if (error) {
      console.error('❌ Errore nel logging:', error.message);
    } else {
      console.log('✅ Login logged con successo');
    }
  } catch (err) {
    console.error('❌ Errore in logUserLogin:', err.message);
  }
};

/**
 * Funzione di login per tabella users_secure
 * (Stessa logica del sistema principale ma usa users_secure)
 */
const loginUserSecure = async (username, password) => {
  try {
    console.log(`🔐 Tentativo login per: ${username}`);

    // Query su tabella users_secure invece di users
    const { data, error } = await supabase
      .from('users_secure')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      console.log('❌ Query fallita:', error.message);
      return null;
    }

    if (!data) {
      console.log('❌ Utente non trovato nella tabella users_secure');
      return null;
    }

    console.log('✅ Utente trovato:', { id: data.id, username: data.username });

    // Verifica password (stessa logica del sistema principale)
    if (data.password !== password) {
      console.log('❌ Password errata');
      return null;
    }

    console.log('✅ Password verificata con successo');

    // Log del login (stessa logica del sistema principale)
    await logUserLogin(username);

    console.log('🎉 Login completato con successo!');
    return {
      id: data.id,
      username: data.username,
      team: data.team,
      admin: data.admin,
      created_at: data.created_at
    };

  } catch (err) {
    console.error('💥 Errore in loginUserSecure:', err.message);
    return null;
  }
};

/**
 * Test cases per validare il funzionamento
 */
const runTests = async () => {
  console.log('🧪 === TEST RLS LOGIN SYSTEM ===\n');
  console.log(`📍 Database URL: ${supabaseUrl}`);
  console.log(`🔑 Using Anon Key: ${supabaseAnonKey.substring(0, 20)}...\n`);

  // Verifica connessione al database
  console.log('🔍 Test connessione database...');
  try {
    const { data, error } = await supabase.from('users_secure').select('count').limit(1);
    if (error) {
      console.error('❌ Errore connessione database:', error.message);
      return;
    }
    console.log('✅ Connessione database OK\n');
  } catch (err) {
    console.error('❌ Errore connessione:', err.message);
    return;
  }

  // Test cases di login
  const testCases = [
    {
      description: 'Login valido - utente normale',
      username: 'testuser',
      password: 'testpass',
      expected: true
    },
    {
      description: 'Login valido - amministratore',
      username: 'admin',
      password: 'admin123',
      expected: true
    },
    {
      description: 'Login fallito - password errata',
      username: 'testuser',
      password: 'wrongpass',
      expected: false
    },
    {
      description: 'Login fallito - utente non esistente',
      username: 'nonexistent',
      password: 'anypass',
      expected: false
    }
  ];

  console.log('🧪 === ESECUZIONE TEST ===\n');

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`${i + 1}. ${testCase.description}`);
    console.log(`   Username: ${testCase.username}`);

    const result = await loginUserSecure(testCase.username, testCase.password);

    if (result && testCase.expected) {
      console.log('   ✅ SUCCESSO - Login riuscito');
      console.log(`   📊 User Data: ID=${result.id}, Admin=${result.admin}, Team=${result.team || 'N/A'}`);
    } else if (!result && !testCase.expected) {
      console.log('   ✅ SUCCESSO - Login rifiutato correttamente');
    } else if (result && !testCase.expected) {
      console.log('   ❌ FALLIMENTO - Login riuscito ma doveva fallire');
    } else {
      console.log('   ❌ FALLIMENTO - Login fallito ma doveva riuscire');
    }

    console.log(''); // Riga vuota per separare i test
  }

  console.log('🎯 === TEST COMPLETATI ===');
  console.log('\n💡 Per testare RLS:');
  console.log('   1. Abilita RLS sulla tabella users_secure');
  console.log('   2. Crea policy di sicurezza');
  console.log('   3. R esegui questo script per verificare');
  console.log('   4. Una volta funzionante, applica al sistema principale');
};

// Esegui i test
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  loginUserSecure,
  getUserIP,
  logUserLogin
};
