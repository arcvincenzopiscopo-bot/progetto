/**
 * Test per la funzione di validazione delle coordinate dei POI
 * Questo test verifica che la funzione validatePoi gestisca correttamente vari casi edge case
 */

// Simuliamo la funzione validatePoi corretta
function validatePoi(poi, anno) {
    // Verifica che latitudine e longitudine esistano e non siano null/undefined
    if (poi.latitudine === null || poi.latitudine === undefined ||
        poi.longitudine === null || poi.longitudine === undefined) {
        return null;
    }

    // Verifica che siano effettivamente numeri (non stringhe, oggetti, ecc.)
    if (typeof poi.latitudine !== 'number' || typeof poi.longitudine !== 'number') {
        return null;
    }

    // Verifica che non siano NaN o Infinity
    if (isNaN(poi.latitudine) || isNaN(poi.longitudine) ||
        !isFinite(poi.latitudine) || !isFinite(poi.longitudine)) {
        return null;
    }

    // Verifica che le coordinate siano in un range ragionevole
    if (poi.latitudine < -90 || poi.latitudine > 90 ||
        poi.longitudine < -180 || poi.longitudine > 180) {
        return null;
    }

    return anno ? { ...poi, anno } : poi;
}

// Test cases
const testCases = [
    // Casi validi
    {
        name: "Coordinate valide normali",
        poi: { id: 1, latitudine: 41.9028, longitudine: 12.4964 },
        expected: true,
        description: "Coordinate di Roma, dovrebbero essere valide"
    },
    {
        name: "Coordinate ai limiti validi",
        poi: { id: 2, latitudine: 90, longitudine: 180 },
        expected: true,
        description: "Coordinate ai limiti massimi validi"
    },
    {
        name: "Coordinate ai limiti minimi validi",
        poi: { id: 3, latitudine: -90, longitudine: -180 },
        expected: true,
        description: "Coordinate ai limiti minimi validi"
    },

    // Casi invalid - null/undefined
    {
        name: "Latitudine null",
        poi: { id: 4, latitudine: null, longitudine: 12.4964 },
        expected: false,
        description: "Latitudine null dovrebbe essere invalida"
    },
    {
        name: "Longitudine undefined",
        poi: { id: 5, latitudine: 41.9028, longitudine: undefined },
        expected: false,
        description: "Longitudine undefined dovrebbe essere invalida"
    },

    // Casi invalid - NaN
    {
        name: "Latitudine NaN",
        poi: { id: 6, latitudine: NaN, longitudine: 12.4964 },
        expected: false,
        description: "Latitudine NaN dovrebbe essere invalida"
    },
    {
        name: "Longitudine NaN",
        poi: { id: 7, latitudine: 41.9028, longitudine: NaN },
        expected: false,
        description: "Longitudine NaN dovrebbe essere invalida"
    },

    // Casi invalid - Infinity
    {
        name: "Latitudine Infinity",
        poi: { id: 8, latitudine: Infinity, longitudine: 12.4964 },
        expected: false,
        description: "Latitudine Infinity dovrebbe essere invalida"
    },
    {
        name: "Longitudine -Infinity",
        poi: { id: 9, latitudine: 41.9028, longitudine: -Infinity },
        expected: false,
        description: "Longitudine -Infinity dovrebbe essere invalida"
    },

    // Casi invalid - fuori range
    {
        name: "Latitudine fuori range (troppo alta)",
        poi: { id: 10, latitudine: 91, longitudine: 12.4964 },
        expected: false,
        description: "Latitudine > 90 dovrebbe essere invalida"
    },
    {
        name: "Latitudine fuori range (troppo bassa)",
        poi: { id: 11, latitudine: -91, longitudine: 12.4964 },
        expected: false,
        description: "Latitudine < -90 dovrebbe essere invalida"
    },
    {
        name: "Longitudine fuori range (troppo alta)",
        poi: { id: 12, latitudine: 41.9028, longitudine: 181 },
        expected: false,
        description: "Longitudine > 180 dovrebbe essere invalida"
    },
    {
        name: "Longitudine fuori range (troppo bassa)",
        poi: { id: 13, latitudine: 41.9028, longitudine: -181 },
        expected: false,
        description: "Longitudine < -180 dovrebbe essere invalida"
    },

    // Casi invalid - tipo sbagliato
    {
        name: "Latitudine stringa",
        poi: { id: 14, latitudine: "41.9028", longitudine: 12.4964 },
        expected: false,
        description: "Latitudine come stringa dovrebbe essere invalida"
    },
    {
        name: "Longitudine oggetto",
        poi: { id: 15, latitudine: 41.9028, longitudine: {} },
        expected: false,
        description: "Longitudine come oggetto dovrebbe essere invalida"
    }
];

// Esegui i test
console.log('🧪 Esecuzione test di validazione coordinate POI');
console.log('==============================================\n');

let passedTests = 0;
let failedTests = 0;

testCases.forEach((testCase, index) => {
    const result = validatePoi(testCase.poi);
    const isValid = result !== null;
    const testPassed = isValid === testCase.expected;

    if (testPassed) {
        console.log(`✅ Test ${index + 1}: ${testCase.name}`);
        console.log(`   ${testCase.description}`);
        passedTests++;
    } else {
        console.log(`❌ Test ${index + 1}: ${testCase.name}`);
        console.log(`   ${testCase.description}`);
        console.log(`   Atteso: ${testCase.expected ? 'valido' : 'invalido'}, Ottenuto: ${isValid ? 'valido' : 'invalido'}`);
        failedTests++;
    }
    console.log('');
});

console.log('==============================================');
console.log(`📊 Risultati: ${passedTests}/${testCases.length} test superati`);
if (failedTests > 0) {
    console.log(`❌ ${failedTests} test falliti`);
} else {
    console.log('✅ Tutti i test superati! La funzione di validazione delle coordinate funziona correttamente.');
}
