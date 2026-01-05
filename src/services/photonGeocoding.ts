export interface GeocodingResult {
  lat: number;
  lng: number;
  address: string;
  houseNumber?: string;
  street?: string;
  city?: string;
  country?: string;
  source: string;
}

export const photonGeocoding = async (query: string): Promise<GeocodingResult> => {
  // Photon ha una sintassi API diversa e bbox può causare errori
  const url = `https://photon.komoot.io/api?q=${encodeURIComponent(query)}&limit=1&lang=it`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      // Se Photon fallisce completamente, lanciamo un errore per andare al fallback
      throw new Error(`Photon API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new Error('Photon: No results found');
    }

    const feature = data.features[0];
    const properties = feature.properties;

    return {
      lat: feature.geometry.coordinates[1],
      lng: feature.geometry.coordinates[0],
      address: properties.name || `${properties.street || ''} ${properties.housenumber || ''}, ${properties.city || ''}`.trim(),
      houseNumber: properties.housenumber,
      street: properties.street,
      city: properties.city,
      country: 'Italia',
      source: 'photon'
    };

  } catch (error) {
    // Rilanciamo l'errore per permettere il fallback a Nominatim
    throw error;
  }
};
