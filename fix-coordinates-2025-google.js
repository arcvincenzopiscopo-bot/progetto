#!/usr/bin/env node

/**
 * Script per valorizzare latitudine e longitudine nei record di points_old_2025
 * che hanno coordinate_invalide null o stringa vuota, utilizzando SOLO Google Maps.
 *
 * Logica:
 * - Cerca record con coordinate_invalide IS NULL OR coordinate_invalide = ''
 * - Usa Google Maps Geocoding API per ottenere coordinate
 * - Aggiorna latitudine, longitudine E imposta coordinate_invalide = '000'
 * - Conta e logga tutte le interrogazioni a Google Maps
 *
 * Rate limiting: 1 secondo tra richieste
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configurazione Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Errore: Variabili d\'ambiente Supabase mancanti');
  console.error('Assicurati di avere REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY nel file .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Configurazione Google Maps
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  console.error('❌ Errore: Google Maps API key mancante');
  console.error('Assicurati di avere REACT_APP_GOOGLE_MAPS_API_KEY nel file .env');
  process.exit(1);
}

// ============================
// FUNZIONI GEOCODING GOOGLE MAPS
// ============================

/**
 * Geocoding con Google Maps API REST
 */
async function geocodeWithGoogleMaps(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}&language=it&region=IT`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Google Maps API error: ${response.status}`);
  }

  // Check per errori API
  if (data.status !== 'OK') {
    throw new Error(`Google Maps API status: ${data.status} - ${data.error_message || 'Unknown error'}`);
  }

  if (!data.results || data.results.length === 0) {
    throw new Error('Google Maps: Nessun risultato trovato');
  }

  const result = data.results[0];
  const location = result.geometry.location;

  return {
    lat: location.lat,
    lng: location.lng,
    address: result.formatted_address,
    source: 'google'
  };
}

/**
 * Incrementa il contatore Google Maps nel database
 */
async function incrementGoogleMapsUsage() {
  try {
    const currentMonthKey = getCurrentMonthKey();
    const now = new Date().toISOString();

    // Prima proviamo a vedere se esiste già una riga per questo mese
    const { data: existingRecord, error: selectError } = await supabase
      .from('conteggi_mensili_google')
      .select('conteggi')
      .eq('mese', currentMonthKey)
      .single();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.warn('⚠️ Errore nel controllo record esistente:', selectError.message);
      return false;
    }

    if (existingRecord) {
      // Riga esistente, incrementiamo il contatore
      const newCount = existingRecord.conteggi + 1;

      const { error: updateError } = await supabase
        .from('conteggi_mensili_google')
        .update({
          conteggi: newCount,
          ultima_richiesta: now
        })
        .eq('mese', currentMonthKey);

      if (updateError) {
        console.warn('⚠️ Errore nell\'aggiornamento contatore:', updateError.message);
        return false;
      } else {
        console.log(`📊 Contatore Google aggiornato: ${newCount} interrogazioni questo mese`);
        return true;
      }
    } else {
      // Riga non esistente, creiamo una nuova
      const { error: insertError } = await supabase
        .from('conteggi_mensili_google')
        .insert({
          mese: currentMonthKey,
          conteggi: 1,
          ultima_richiesta: now
        });

      if (insertError) {
        console.warn('⚠️ Errore nella creazione contatore:', insertError.message);
        return false;
      } else {
        console.log('📊 Contatore Google creato per il mese corrente');
        return true;
      }
    }
  } catch (error) {
    console.warn('⚠️ Errore imprevisto nel contatore Google:', error.message);
    return false;
  }
}

/**
 * Genera la chiave mese corrente nel formato "MM-YYYY"
 */
function getCurrentMonthKey() {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear().toString();
  return `${month}-${year}`;
}

// ============================
// LOGICA PRINCIPALE
// ============================

async function main() {
  console.log('🚀 Avvio script geocoding Google Maps per points_old_2025\n');

  try {
    // 1. Trova record con coordinate_invalide null o vuote
    console.log('🔍 Ricerca record con coordinate_invalide nulle o vuote...');

    const { data: records, error } = await supabase
      .from('points_old_2025')
      .select('id, indirizzo, latitudine, longitudine, coordinate_invalide')
      .or('coordinate_invalide.is.null,coordinate_invalide.eq.0');

    if (error) {
      console.error('❌ Errore nella query:', error);
      return;
    }

    if (!records || records.length === 0) {
      console.log('✅ Nessun record trovato con coordinate_invalide nulle o vuote');
      return;
    }

    console.log(`📊 Trovati ${records.length} record da elaborare\n`);

    // 2. Elabora ogni record
    let successCount = 0;
    let errorCount = 0;
    let googleRequestsCount = 0;
    const startTime = Date.now();

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      console.log(`\n📍 [${i + 1}/${records.length}] Elaborando ID ${record.id}: "${record.indirizzo}"`);

      try {
        // Geocoding con Google Maps
        console.log('🔍 Geocoding con Google Maps...');
        const geoResult = await geocodeWithGoogleMaps(record.indirizzo);

        // Incrementa contatore Google Maps
        await incrementGoogleMapsUsage();
        googleRequestsCount++;

        // Aggiorna il database con coordinate E flag coordinate_invalide = '000'
        const { error: updateError } = await supabase
          .from('points_old_2025')
          .update({
            latitudine: geoResult.lat,
            longitudine: geoResult.lng,
            coordinate_invalide: '000' // Flag che indica coordinate validate da Google
          })
          .eq('id', record.id);

        if (updateError) {
          throw new Error(`Errore aggiornamento DB: ${updateError.message}`);
        }

        console.log(`✅ SUCCESSO: ${record.indirizzo}`);
        console.log(`   📍 Coordinate: Lat ${geoResult.lat.toFixed(6)}, Lng ${geoResult.lng.toFixed(6)}`);
        console.log(`   🏷️  coordinate_invalide impostato a '000'`);
        console.log(`   🔢 Interrogazioni Google: ${googleRequestsCount}`);
        successCount++;

      } catch (error) {
        console.log(`❌ ERRORE: ${record.indirizzo} - ${error.message}`);
        errorCount++;
      }

      // Rate limiting: aspetta 1 secondo tra richieste per rispettare limiti API Google
      if (i < records.length - 1) {
        console.log('⏱️  Attesa 1 secondo per rate limiting...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 3. Report finale
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    console.log('\n' + '='.repeat(60));
    console.log('📊 RISULTATI FINALI:');
    console.log(`✅ Riusciti: ${successCount}`);
    console.log(`❌ Falliti: ${errorCount}`);
    console.log(`🔢 Interrogazioni Google totali: ${googleRequestsCount}`);
    console.log(`💰 Costo stimato: $${(googleRequestsCount * 0.005).toFixed(3)} (${googleRequestsCount}/40.000 richieste gratuite)`);
    console.log(`⏱️  Tempo totale: ${duration} secondi`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Errore critico:', error);
    process.exit(1);
  }
}

// Esegui lo script
main().catch(error => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});