# 🚀 Script Importazione CSV - points_old

**Questo file NON deve essere committato su Git.** È uno script standalone per importare dati CSV.

## 📋 Descrizione

Script Node.js per importare indirizzi da file CSV nella tabella `points_old` di Supabase.

## 📁 File Richiesti

- `2025- E 2024.csv` - File CSV con gli indirizzi da importare (colonna A, righe 1-668)

## 🗄️ Struttura Database

La tabella `points_old` riceverà record con questa struttura:

```sql
{
  indirizzo: string,     -- Valore dalla colonna A del CSV
  created_at: timestamp, -- Data odierna
  latitudine: null,      -- Sempre null
  longitudine: null,     -- Sempre null
  anno: "2024"          -- Sempre "2024"
}
```

## 🚀 Come Usare

### 1. Installazione Dipendenze
```bash
npm install csv-parser @supabase/supabase-js dotenv
```

### 2. Preparazione
- Assicurati che il file `.env` contenga le credenziali Supabase:
```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_key
```

- Posiziona il file `2025- E 2024.csv` nella cartella del progetto

### 3. Esecuzione
```bash
node import-csv.js
```

## 📊 Output

Lo script mostrerà il progresso in tempo reale:

```
🚀 Avvio importazione CSV...
📁 File CSV: /path/to/2025- E 2024.csv
🗄️ Tabella destinazione: points_old

📖 Lettura file CSV...
📊 Processate 50 righe...
📊 Processate 100 righe...
✅ Lettura CSV completata. 668 righe processate, 668 record validi da importare.

📤 Avvio importazione su Supabase...
📦 Creazione di 7 batch da massimo 100 record ciascuno
🔄 Importazione batch 1/7 (100 record)...
✅ Batch 1 completato (100 record inseriti)
🔄 Importazione batch 2/7 (100 record)...
✅ Batch 2 completato (100 record inseriti)
...

🎉 IMPORTAZIONE COMPLETATA!
📊 RIEPILOGO:
   • Righe CSV processate: 668
   • Record validi: 668
   • Record importati con successo: 668
   • Record falliti: 0
   • Tasso di successo: 100.0%
```

## ⚙️ Configurazione

### Batch Size
Modifica `batchSize` nello script per controllare quanti record importare per volta:
```javascript
const batchSize = 100; // Modifica questo valore
```

### Tabella Destinazione
Modifica il nome della tabella se necessario:
```javascript
.from('points_old') // Modifica questo nome
```

## 🛠️ Troubleshooting

### Errore: File CSV non trovato
- Assicurati che `2025- E 2024.csv` sia nella cartella del progetto
- Verifica il nome del file (case sensitive)

### Errore: Credenziali Supabase mancanti
- Verifica che il file `.env` esista e contenga le variabili corrette
- Ricarica le variabili con `source .env` se necessario

### Errore: Permessi tabella
- Verifica che la tabella `points_old` esista in Supabase
- Controlla i permessi RLS (Row Level Security)

## 🔒 Sicurezza

- **NON committare questo script su Git**
- Le credenziali sono lette dal file `.env` locale
- Lo script è aggiunto al `.gitignore`

## 📞 Supporto

In caso di errori, controlla:
1. Connessione internet
2. Credenziali Supabase valide
3. Tabella `points_old` esistente
4. File CSV correttamente formattato
