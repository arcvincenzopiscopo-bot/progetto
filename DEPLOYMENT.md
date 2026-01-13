# 🚀 Guida Deployment Multi-Environment

Questa guida spiega come gestire versioni separate dell'app per sviluppo e produzione.

## 📋 Branch Strategy

```
main (Produzione)     → https://tuosito.vercel.app
develop (Test)        → https://develop-tuosito.vercel.app
feature/* (Features)  → Preview deployments automatici
```

## 🛠️ Setup Iniziale (Completato)

### ✅ Branch Develop Creato
```bash
git checkout -b develop
git push -u origin develop
```

### ✅ Configurazione Vercel
- File `vercel.json` creato con configurazione ottimale
- Headers di sicurezza aggiunti
- Framework React configurato

### ✅ Banner di Sviluppo
- Banner arancione visibile solo in modalità sviluppo
- Avverte che è versione di test

## 🔧 Configurazione GitHub (Da fare manualmente)

### 1. Proteggi il Branch Main
Vai su GitHub → Repository → Settings → Branches → Add rule

**Branch name pattern:** `main`

**Require status checks:**
- [x] Require branches to be up to date
- [x] Require status checks to pass
- [x] Require branches to be up to date before merging

**Require approvals:**
- [x] Require pull request reviews before merging
- [x] Require review from Code Owners
- [x] Restrict who can dismiss pull request reviews

### 2. Abilita Branch Protection per Develop (Opzionale)
Stessa configurazione ma meno restrittiva per develop.

## 🌐 Configurazione Vercel

### Opzione A: Deploy Automatico da Branch
1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il progetto
3. Vai su Settings → Git
4. Aggiungi regola per branch `develop`:
   ```
   Branch: develop
   Name: develop
   Build Command: npm run build
   Root Directory: ./
   ```

### Opzione B: Preview Deployments
Vercel crea automaticamente preview per ogni PR:
- Push su branch → Deploy preview
- PR aperta → URL preview nei commenti

## 📝 Workflow di Sviluppo

### Sviluppo Normale
```bash
# Lavora su develop
git checkout develop
git pull origin develop

# Crea feature branch
git checkout -b feature/nuova-funzione

# Commit e push
git add .
git commit -m "feat: descrizione"
git push origin feature/nuova-funzione
```

### Creazione Pull Request
1. Vai su GitHub → Pull Request
2. Base: `develop` ← Compare: `feature/nuova-funzione`
3. Aggiungi descrizione e reviewers
4. Vercel creerà automaticamente preview URL

### Merge in Produzione
```bash
# Da develop, esegui lo script sicuro
./scripts/merge-to-production.sh
```

O manualmente:
```bash
# Assicurati di essere su develop e pulito
git checkout develop
git pull origin develop

# Verifica build
npm run build

# Vai su main
git checkout main
git pull origin main

# Merge
git merge develop --no-ff -m "Release: descrizione"

# Push
git push origin main

# Torna a develop
git checkout develop
```

## 🔍 Testing delle Versioni

| Versione | URL | Scopo |
|----------|-----|-------|
| Produzione | `https://tuosito.vercel.app` | Utenti finali |
| Sviluppo | `https://develop-tuosito.vercel.app` | Test interni |
| Feature | `https://feature-nome-tuosito.vercel.app` | Test specifiche |

## 🛡️ Sicurezza

- **Branch main**: Sempre stabile, richiede review
- **Branch develop**: Versione di test, più flessibile
- **Feature branches**: Per sviluppo isolato

## 🚨 Troubleshooting

### Build Fallisce
```bash
# Verifica dipendenze
npm install

# Build locale
npm run build

# Verifica errori
```

### Deploy Non Parte
- Controlla che il branch sia pushato
- Verifica configurazione Vercel
- Controlla status checks su GitHub

### Banner Non Compare
- Il banner appare solo in `NODE_ENV=development`
- Su Vercel è sempre `production`

## 📞 Supporto

Per problemi:
1. Controlla i logs di Vercel
2. Verifica configurazione GitHub
3. Controlla script di merge
