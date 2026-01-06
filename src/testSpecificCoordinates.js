/**
 * Test specifico per le coordinate 40.9325993, 14.2580753
 * che vengono segnalate come non valide ma dovrebbero essere valide
 */

// Simuliamo la funzione validatePoi corretta
function validatePoi(poi, anno) {
    console.log('Testing POI:', poi.id, 'Lat:', poi.latitudine, 'Lng:', poi.longitudine);

    // Verifica che latitudine e longitudine esistano e non siano null/undefined
    if (poi.latitudine === null || poi.latitudine === undefined ||
        poi.longitudine === null || poi.longitudine === undefined) {
        console.log('❌ Failed: null/undefined check');
        return null;
    }

    // Verifica che siano effettivamente numeri (non stringhe, oggetti, ecc.)
    if (typeof poi.latitudine !== 'number' || typeof poi.longitudine !== 'number') {
        console.log('❌ Failed: type check. Lat type:', typeof poi.latitudine, 'Lng type:', typeof poi.longitudine);
        return null;
    }

    // Verifica che non siano NaN o Infinity
    if (isNaN(poi.latitudine) || isNaN(poi.longitudine) ||
        !isFinite(poi.latitudine) || !isFinite(poi.longitudine)) {
        console.log('❌ Failed: NaN/Infinity check. isNaN(lat):', isNaN(poi.latitudine), 'isNaN(lng):', isNaN(poi.longitudine));
        return null;
    }

    // Verifica che le coordinate siano in un range ragionevole
    if (poi.latitudine < -90 || poi.latitudine > 90 ||
        poi.longitudine < -180 || poi.longitudine > 180) {
        console.log('❌ Failed: range check. Lat:', poi.latitudine, 'Lng:', poi.longitudine);
        return null;
    }

    console.log('✅ Passed all checks');
    return anno ? { ...poi, anno } : poi;
}

// Test con le coordinate problematiche
const testPoi = {
    id: 'test-1',
    latitudine: 40.9325993,
    longitudine: 14.2580753,
    indirizzo: 'Test address'
};

console.log('🔍 Testing specific coordinates: 40.9325993, 14.2580753');
console.log('These coordinates should be VALID but are being rejected');
console.log('');

const result = validatePoi(testPoi);
console.log('');
console.log('Final result:', result !== null ? '✅ VALID' : '❌ INVALID');

// Test anche la conversione da stringa
console.log('\n🔍 Testing string to number conversion:');
const latStr = "40.9325993";
const lngStr = "14.2580753";

const lat = parseFloat(latStr);
const lng = parseFloat(lngStr);

console.log('String lat:', latStr, '-> parseFloat:', lat, 'isNaN:', isNaN(lat));
console.log('String lng:', lngStr, '-> parseFloat:', lng, 'isNaN:', isNaN(lng));

const convertedPoi = {
    id: 'test-2',
    latitudine: lat,
    longitudine: lng,
    indirizzo: 'Converted from string'
};

console.log('\nTesting converted POI:');
const convertedResult = validatePoi(convertedPoi);
console.log('Converted result:', convertedResult !== null ? '✅ VALID' : '❌ INVALID');

// Test con precisione più alta
console.log('\n🔍 Testing with higher precision coordinates:');
const highPrecisionPoi = {
    id: 'test-3',
    latitudine: 40.9325993456789,
    longitudine: 14.2580753123456,
    indirizzo: 'High precision test'
};

const highPrecisionResult = validatePoi(highPrecisionPoi);
console.log('High precision result:', highPrecisionResult !== null ? '✅ VALID' : '❌ INVALID');
