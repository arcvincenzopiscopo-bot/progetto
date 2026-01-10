/**
 * Script di test per il servizio di conteggio Google Maps
 * Esegue alcune operazioni di test per verificare il funzionamento
 */

import { incrementGoogleMapsUsage, getGoogleMapsUsage, getAllGoogleMapsUsage } from './services/googleMapsCounterService.js';

// Funzione di test
async function testGoogleMapsCounter() {
  console.log('🧪 Starting Google Maps Counter tests...\n');

  try {
    // Test 1: Ottieni il conteggio corrente
    console.log('Test 1: Getting current usage...');
    const currentUsage = await getGoogleMapsUsage();
    console.log('Current usage:', currentUsage);
    console.log('');

    // Test 2: Incrementa il contatore
    console.log('Test 2: Incrementing usage counter...');
    await incrementGoogleMapsUsage();
    console.log('Increment completed');
    console.log('');

    // Test 3: Verifica che il conteggio sia aumentato
    console.log('Test 3: Checking updated usage...');
    const updatedUsage = await getGoogleMapsUsage();
    console.log('Updated usage:', updatedUsage);
    console.log('');

    // Test 4: Ottieni tutti i record
    console.log('Test 4: Getting all usage records...');
    const allUsage = await getAllGoogleMapsUsage();
    console.log('All usage records:', allUsage);
    console.log('');

    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Esegui il test se questo script viene chiamato direttamente
if (typeof window === 'undefined') {
  // Node.js environment
  testGoogleMapsCounter();
} else {
  // Browser environment - rendi disponibile globalmente
  window.testGoogleMapsCounter = testGoogleMapsCounter;
}
