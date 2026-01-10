export interface PointOfInterest {
  id: string;
  indirizzo: string;
  username: string;
  team: string;
  ispezionabile: number;
  tipo: string;
  note?: string;
  latitudine: number;
  longitudine: number;
  da_approvare?: number;
  photo_url?: string;
  created_at: string;
  anno?: number;
}

/**
 * Valida e filtra POI con coordinate valide
 * @param poi L'oggetto POI da validare
 * @param anno Campo anno opzionale per POI storici
 * @returns Il POI validato o null se invalido
 */
export function validatePoi(poi: any, anno?: number): PointOfInterest | null {
  // Verifica che latitudine e longitudine esistano e non siano null/undefined
  if (poi.latitudine === null || poi.latitudine === undefined ||
      poi.longitudine === null || poi.longitudine === undefined) {
    return null;
  }

  // Converti coordinate in numeri se sono stringhe
  let lat = poi.latitudine;
  let lng = poi.longitudine;

  if (typeof lat === 'string') {
    lat = parseFloat(lat);
  }
  if (typeof lng === 'string') {
    lng = parseFloat(lng);
  }

  // Verifica che siano effettivamente numeri (non stringhe, oggetti, ecc.)
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  // Verifica che non siano NaN o Infinity
  if (isNaN(lat) || isNaN(lng) ||
      !isFinite(lat) || !isFinite(lng)) {
    return null;
  }

  // Verifica che le coordinate siano in un range ragionevole
  if (lat < -90 || lat > 90 ||
      lng < -180 || lng > 180) {
    return null;
  }

  // Crea una copia dell'oggetto con coordinate numeriche
  const validatedPoi = { ...poi, latitudine: lat, longitudine: lng };

  return anno ? { ...validatedPoi, anno } : validatedPoi;
}