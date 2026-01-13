#!/bin/bash

# Script per merge sicuro da develop a main
# Uso: ./scripts/merge-to-production.sh

set -e  # Exit on any error

echo "🚀 Avvio merge da develop a main..."

# Verifica che siamo su develop e che sia pulito
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "develop" ]; then
    echo "❌ Errore: Devi essere sul branch 'develop'. Branch attuale: $CURRENT_BRANCH"
    exit 1
fi

# Verifica working tree pulito
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Errore: Working tree non è pulito. Fai commit o stash delle modifiche."
    exit 1
fi

# Verifica che develop sia aggiornato
echo "📥 Aggiornando develop..."
git pull origin develop

# Verifica che i test passino (se esistono)
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    echo "🧪 Eseguendo test..."
    npm test -- --watchAll=false --passWithNoTests
fi

# Verifica che il build funzioni
echo "🔨 Verificando build..."
npm run build

# Switch a main e aggiorna
echo "🔄 Passando a main e aggiornando..."
git checkout main
git pull origin main

# Merge develop in main
echo "🔀 Merging develop in main..."
git merge develop --no-ff -m "Merge develop into main

$(git log develop --oneline -10 | sed 's/^/- /')"

# Push delle modifiche
echo "📤 Pushando modifiche..."
git push origin main

# Torna a develop
git checkout develop

echo "✅ Merge completato con successo!"
echo "🌐 La versione stabile è ora aggiornata su main"
echo "🔄 Torna al branch develop per continuare lo sviluppo"
