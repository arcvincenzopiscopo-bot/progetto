// Geocoding Tool per points_old_2025 usando Google Maps
// Accessibile solo conoscendo l'URL specifico

// ============================
// CONFIGURAZIONE
// ============================

// Configurazione - queste saranno impostate tramite variabili d'ambiente Vercel
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your-anon-key';
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'your-google-maps-api-key';

// Inizializzazione Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================
// VARIABILI GLOBALI
// ============================

let records = [];
let isProcessing = false;
let processedCount = 0;
let successCount = 0;
let googleRequestsCount = 0;
let stopRequested = false;

// Elementi DOM
const loadBtn = document.getElementById('loadBtn');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const totalRecordsEl = document.getElementById('totalRecords');
const processedRecordsEl = document.getElementById('processedRecords');
const successCountEl = document.getElementById('successCount');
const googleRequestsEl = document.getElementById('googleRequests');
const progressFill = document.getElementById('progressFill');
const logContainer = document.getElementById('logContainer');

// ============================
// UTILITÀ
// ============================

function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${type}`;
    logEntry.textContent = `[${timestamp}] ${message}`;

    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;

    // Mantieni solo gli ultimi 100 messaggi
    while (logContainer.children.length > 100) {
        logContainer.removeChild(logContainer.firstChild);
    }
}

function updateUI() {
    totalRecordsEl.textContent = records.length;
    processedRecordsEl.textContent = processedCount;
    successCountEl.textContent = successCount;
    googleRequestsEl.textContent = googleRequestsCount;

    const progressPercent = records.length > 0 ? (processedCount / records.length) * 100 : 0;
    progressFill.style.width = `${progressPercent}%`;
}

function setButtonState(loading = false, processing = false) {
    loadBtn.disabled = loading || processing;
    startBtn.disabled = !records.length || loading || processing;
    stopBtn.disabled = !processing;

    if (loading) {
        loadBtn.innerHTML = '<span class="loading"></span> Caricamento...';
    } else {
        loadBtn.innerHTML = '📊 Carica Dati';
    }

    if (processing) {
        startBtn.innerHTML = '<span class="loading"></span> Elaborazione...';
        stopBtn.innerHTML = '🛑 Ferma';
    } else {
        startBtn.innerHTML = '🚀 Avvia Geocoding';
        stopBtn.innerHTML = '🛑 Ferma';
    }
}

// ============================
// GEOCODING GOOGLE MAPS
// ============================

async function geocodeAddress(address) {
    return new Promise((resolve, reject) => {
        if (!window.google || !window.google.maps) {
            reject(new Error('Google Maps non è caricato'));
            return;
        }

        const geocoder = new google.maps.Geocoder();

        geocoder.geocode({ address: address }, (results, status) => {
            googleRequestsCount++;

            if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
                const result = results[0];
                const location = result.geometry.location;

                resolve({
                    lat: location.lat(),
                    lng: location.lng(),
                    address: result.formatted_address,
                    source: 'google'
                });
            } else {
                reject(new Error(`Geocoding fallito: ${status}`));
            }
        });
    });
}

// ============================
// DATABASE OPERATIONS
// ============================

async function loadRecords() {
    try {
        log('🔍 Ricerca record con coordinate_invalide nulle o vuote...', 'info');

        const { data, error } = await supabase
            .from('points_old_2025')
            .select('id, indirizzo, latitudine, longitudine, coordinate_invalide')
            .or('coordinate_invalide.is.null,coordinate_invalide.eq.0');

        if (error) {
            throw new Error(`Errore database: ${error.message}`);
        }

        records = data || [];
        processedCount = 0;
        successCount = 0;
        googleRequestsCount = 0;

        updateUI();

        if (records.length === 0) {
            log('✅ Nessun record trovato con coordinate_invalide nulle o vuote', 'success');
        } else {
            log(`📊 Trovati ${records.length} record da elaborare`, 'success');
        }

    } catch (error) {
        log(`❌ Errore caricamento dati: ${error.message}`, 'error');
        throw error;
    }
}

async function updateRecord(recordId, lat, lng) {
    const { error } = await supabase
        .from('points_old_2025')
        .update({
            latitudine: lat,
            longitudine: lng,
            coordinate_invalide: '000' // Flag che indica coordinate validate da Google
        })
        .eq('id', recordId);

    if (error) {
        throw new Error(`Errore aggiornamento DB: ${error.message}`);
    }
}

// ============================
// PROCESSING LOGIC
// ============================

async function processRecords() {
    if (isProcessing) return;

    isProcessing = true;
    stopRequested = false;
    setButtonState(false, true);

    log('🚀 Avvio processamento geocoding...', 'info');

    try {
        for (let i = 0; i < records.length; i++) {
            if (stopRequested) {
                log('🛑 Processamento fermato dall\'utente', 'warning');
                break;
            }

            const record = records[i];
            log(`📍 [${i + 1}/${records.length}] Elaborando ID ${record.id}: "${record.indirizzo}"`, 'info');

            try {
                // Geocoding con Google Maps
                const geoResult = await geocodeAddress(record.indirizzo);

                // Aggiorna il database
                await updateRecord(record.id, geoResult.lat, geoResult.lng);

                // Log successo
                log(`✅ SUCCESSO: ${record.indirizzo}`, 'success');
                log(`   📍 Coordinate: Lat ${geoResult.lat.toFixed(6)}, Lng ${geoResult.lng.toFixed(6)}`, 'success');
                log(`   🏷️ coordinate_invalide impostato a '000'`, 'success');

                successCount++;

            } catch (error) {
                log(`❌ ERRORE: ${record.indirizzo} - ${error.message}`, 'error');
            }

            processedCount++;
            updateUI();

            // Rate limiting: aspetta 1 secondo tra richieste
            if (i < records.length - 1 && !stopRequested) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Report finale
        const successRate = records.length > 0 ? ((successCount / records.length) * 100).toFixed(1) : '0';
        const costEstimate = (googleRequestsCount * 0.005).toFixed(3);

        log('\n' + '='.repeat(60), 'info');
        log('📊 RISULTATI FINALI:', 'info');
        log(`✅ Riusciti: ${successCount}/${records.length} (${successRate}%)`, 'success');
        log(`❌ Falliti: ${records.length - successCount}`, successCount === records.length ? 'success' : 'error');
        log(`🔢 Richieste Google totali: ${googleRequestsCount}`, 'info');
        log(`💰 Costo stimato: $${costEstimate} (${googleRequestsCount}/40.000 richieste gratuite)`, 'info');
        log('='.repeat(60), 'info');

    } catch (error) {
        log(`❌ Errore critico durante processamento: ${error.message}`, 'error');
    } finally {
        isProcessing = false;
        setButtonState(false, false);
    }
}

// ============================
// EVENT LISTENERS
// ============================

loadBtn.addEventListener('click', async () => {
    try {
        setButtonState(true, false);
        await loadRecords();
        setButtonState(false, false);
    } catch (error) {
        setButtonState(false, false);
    }
});

startBtn.addEventListener('click', () => {
    if (records.length === 0) {
        log('❌ Nessun dato caricato. Clicca "Carica Dati" prima.', 'warning');
        return;
    }

    processRecords();
});

stopBtn.addEventListener('click', () => {
    stopRequested = true;
    log('🛑 Richiesta di fermata inviata...', 'warning');
});

// ============================
// INIZIALIZZAZIONE
// ============================

document.addEventListener('DOMContentLoaded', () => {
    log('🔄 Geocoding Tool inizializzato', 'info');
    log('📝 Passi per utilizzare lo strumento:', 'info');
    log('   1. Clicca "Carica Dati" per caricare i record da elaborare', 'info');
    log('   2. Clicca "Avvia Geocoding" per iniziare il processamento', 'info');
    log('   3. Monitora il progresso nel log sottostante', 'info');

    // Verifica che Google Maps sia caricato
    let mapsCheckInterval = setInterval(() => {
        if (window.google && window.google.maps) {
            log('✅ Google Maps API caricato correttamente', 'success');
            clearInterval(mapsCheckInterval);
        }
    }, 500);

    // Timeout dopo 10 secondi
    setTimeout(() => {
        if (!window.google || !window.google.maps) {
            log('❌ Google Maps API non caricato entro 10 secondi', 'error');
            log('Verifica che la chiave API sia corretta e che non ci siano restrizioni referrer', 'error');
        }
        clearInterval(mapsCheckInterval);
    }, 10000);
});

// Gestione errori globali
window.addEventListener('error', (event) => {
    log(`❌ Errore JavaScript: ${event.error?.message || event.message}`, 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    log(`❌ Promise rejection: ${event.reason?.message || event.reason}`, 'error');
});