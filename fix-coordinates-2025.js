#!/usr/bin/env node

/**
 * Script per valorizzare latitudine e longitudine nei record di points_old_2025
 * che hanno latitudine vuota o nulla, utilizzando servizi di geocoding gratuiti.
 *
 * Cascata servizi: OpenCage → Photon → Nominatim
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

// Configurazione servizi geocoding
const OPEN_CAGE_API_KEY = process.env.REACT_APP_OPENCAGE_API_KEY;

// ============================
// FUNZIONI GEOCODING
// ============================

/**
 * Geocoding con OpenCage
 */
async function geocodeWithOpenCage(query) {
  if (!OPEN_CAGE_API_KEY) {
    throw new Error('OpenCage API key non configurata');
  }

  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${OPEN_CAGE_API_KEY}&limit=1&language=it&countrycode=IT`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`OpenCage API error: ${response.status}`);
  }

  if (!data.results || data.results.length === 0) {
    throw new Error('OpenCage: Nessun risultato trovato');
  }

  const result = data.results[0];
  return {
    lat: result.geometry.lat,
    lng: result.geometry.lng,
    address: result.formatted,
    source: 'opencage'
  };
}

/**
 * Geocoding con Photon
 */
async function geocodeWithPhoton(query) {
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; GeocodingApp/1.0)'
    }
  });

  if (!response.ok) {
    throw new Error(`Photon API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data.features || data.features.length === 0) {
    throw new Error('Photon: Nessun risultato trovato');
  }

  const feature = data.features[0];
  const properties = feature.properties;

  return {
    lat: feature.geometry.coordinates[1],
    lng: feature.geometry.coordinates[0],
    address: properties.name || `${properties.street || ''} ${properties.housenumber || ''}, ${properties.city || ''}`.trim(),
    source: 'photon'
  };
}

/**
 * Geocoding con Nominatim (fallback)
 */
async function geocodeWithNominatim(query) {
  const searchParams = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    limit: '1',
    countrycodes: 'IT',
    'accept-language': 'it,en'
  });

  const url = `https://nominatim.openstreetmap.org/search?${searchParams.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'GeocodingScript/1.0 (contact@puntiinteresse.it)'
    }
  });

  if (!response.ok) {
    throw new Error(`Nominatim API error: ${response.status}`);
  }

  const data = await response.json();

  if (!data || data.length === 0) {
    throw new Error('Nominatim: Nessun risultato trovato');
  }

  const result = data[0];
  return {
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    address: result.display_name,
    source: 'nominatim'
  };
}

/**
 * Funzione principale di geocoding con cascata
 */
async function geocodeAddress(address) {
  console.log(`🔍 Geocoding per: "${address}"`);

  // 1. Prova OpenCage
  try {
    console.log('  📍 Provando OpenCage...');
    const result = await geocodeWithOpenCage(address);
    console.log(`  ✅ OpenCage riuscito: ${result.address}`);
    return result;
  } catch (error) {
    console.log(`  ❌ OpenCage fallito: ${error.message}`);
  }

  // 2. Fallback a Photon
  try {
    console.log('  📍 Provando Photon...');
    const result = await geocodeWithPhoton(address);
    console.log(`  ✅ Photon riuscito: ${result.address}`);
    return result;
  } catch (error) {
    console.log(`  ❌ Photon fallito: ${error.message}`);
  }

  // 3. Fallback finale a Nominatim
  try {
    console.log('  📍 Provando Nominatim...');
    const result = await geocodeWithNominatim(address);
    console.log(`  ✅ Nominatim riuscito: ${result.address}`);
    return result;
  } catch (error) {
    console.log(`  ❌ Nominatim fallito: ${error.message}`);
    throw new Error(`Tutti i servizi geocoding hanno fallito per "${address}"`);
  }
}

// ============================
// LOGICA PRINCIPALE
// ============================

async function main() {
  console.log('🚀 Avvio script geocoding points_old_2025\n');

  try {
    // 1. Trova record con latitudine vuota o nulla
    console.log('🔍 Ricerca record con latitudine vuota...');

    const { data: records, error } = await supabase
      .from('points_old_2025')
      .select('id, indirizzo, latitudine, longitudine')
      .or('latitudine.is.null,latitudine.eq.,latitudine.eq.0');

    if (error) {
      console.error('❌ Errore nella query:', error);
      return;
    }

    if (!records || records.length === 0) {
      console.log('✅ Nessun record trovato con latitudine vuota');
      return;
    }

    console.log(`📊 Trovati ${records.length} record da elaborare\n`);

    // 2. Elabora ogni record
    let successCount = 0;
    let errorCount = 0;
    const startTime = Date.now();

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      console.log(`\n📍 [${i + 1}/${records.length}] Elaborando ID ${record.id}: "${record.indirizzo}"`);

      try {
        // Geocoding dell'indirizzo
        const geoResult = await geocodeAddress(record.indirizzo);

        // Aggiorna il database
        const { error: updateError } = await supabase
          .from('points_old_2025')
          .update({
            latitudine: geoResult.lat,
            longitudine: geoResult.lng
          })
          .eq('id', record.id);

        if (updateError) {
          throw new Error(`Errore aggiornamento DB: ${updateError.message}`);
        }

        console.log(`✅ SUCCESSO: ${record.indirizzo} → Lat: ${geoResult.lat.toFixed(6)}, Lng: ${geoResult.lng.toFixed(6)} (${geoResult.source})`);
        successCount++;

      } catch (error) {
        console.log(`❌ ERRORE: ${record.indirizzo} - ${error.message}`);
        errorCount++;
      }

      // Rate limiting: aspetta 1 secondo tra richieste per rispettare limiti API
      if (i < records.length - 1) {
        console.log('⏱️  Attesa 1 secondo per rate limiting...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 3. Report finale
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    console.log('\n' + '='.repeat(50));
    console.log('📊 RISULTATI FINALI:');
    console.log(`✅ Riusciti: ${successCount}`);
    console.log(`❌ Falliti: ${errorCount}`);
    console.log(`⏱️  Tempo totale: ${duration} secondi`);
    console.log('='.repeat(50));

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