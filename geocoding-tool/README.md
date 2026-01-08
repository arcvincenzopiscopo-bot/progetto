# 🗺️ Geocoding Tool - Points 2025

Strumento web per valorizzare le coordinate della tabella `points_old_2025` utilizzando Google Maps Geocoding API.

## 🚀 Deploy su Vercel

### 1. Prepara il Progetto
```bash
# Vai nella cartella del tool
cd geocoding-tool

# Installa dipendenze
npm install
```

### 2. Deploy su Vercel
```bash
# Installa Vercel CLI (se non già installato)
npm install -g vercel

# Effettua il login
vercel login

# Deploy del progetto
vercel --prod
```

### 3. Configura Variabili d'Ambiente
Nel dashboard Vercel, vai su **Settings → Environment Variables** e aggiungi:

```
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### 4. Importante: Configurazione Google Maps API
La chiave Google Maps DEVE avere **rimossi i vincoli di referrer** per funzionare su Vercel:

1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. **API e servizi → Credenziali**
3. Seleziona la chiave `REACT_APP_GOOGLE_MAPS_API_KEY`
4. **Restrizioni applicazione**: Imposta "Nessuna restrizione"
5. **Restrizioni API**: Lascia abilitate tutte le API necessarie
6. **Salva**

## 📋 Utilizzo dello Strumento

### URL di Accesso
Dopo il deploy, Vercel fornirà un URL tipo:
```
https://geocoding-tool-[random].vercel.app
```

**IMPORTANTE**: Questa URL è l'unico modo per accedere allo strumento.

### Come Usare

1. **Carica Dati**: Clicca "📊 Carica Dati" per caricare i record con `coordinate_invalide` null o 0
2. **Avvia Processing**: Clicca "🚀 Avvia Geocoding" per iniziare
3. **Monitora Progresso**: Guarda il log in tempo reale
4. **Ferma se necessario**: Usa "🛑 Ferma" per interrompere

### Cosa Fa

- ✅ Trova record con `coordinate_invalide IS NULL OR coordinate_invalide = 0`
- ✅ Usa Google Maps per ottenere coordinate dall'indirizzo
- ✅ Aggiorna `latitudine` e `longitudine` nel database
- ✅ Imposta `coordinate_invalide = '000'` come flag di validazione
- ✅ Conta e mostra tutte le richieste a Google Maps

## 📊 Monitoraggio

Lo strumento mostra:
- **Record Totali**: Quanti record sono stati caricati
- **Elaborati**: Quanti sono stati processati
- **Successi**: Quanti hanno avuto coordinate valide
- **Richieste Google**: Numero totale di API calls (costo: $0.005 per richiesta)

## 🛡️ Sicurezza

- **Accesso limitato**: Solo conoscendo l'URL esatta
- **Rate limiting**: 1 secondo tra richieste per rispettare limiti API
- **Logging dettagliato**: Traccia di tutte le operazioni

## 🆘 Troubleshooting

### "API keys with referer restrictions cannot be used with this API"
- Rimuovi le restrizioni referrer dalla chiave Google Maps API

### "Google Maps API non caricato"
- Verifica che la chiave API sia corretta
- Assicurati che le variabili d'ambiente siano impostate in Vercel

### "Errore database"
- Verifica le credenziali Supabase
- Assicurati che la tabella `points_old_2025` esista

## 📈 Costi Google Maps

- **Gratuito**: $200 di credito mensile
- **Costo per richiesta**: $0.005
- **Richieste gratuite**: 40.000 al mese
- **Monitora**: Lo strumento conta automaticamente le richieste

## 🏗️ Architettura

```
geocoding-tool/
├── index.html      # Interfaccia utente
├── script.js       # Logica di geocoding
├── package.json    # Configurazione npm
└── vercel.json     # Configurazione deploy
```

Il tool è **completamente indipendente** dal progetto principale e può essere utilizzato standalone.