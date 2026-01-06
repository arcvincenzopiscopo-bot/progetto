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
  // URL corretto per Photon (risolto: rimuovere lang=it che causa errore 400)
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;

  try {
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
    throw error;
  }
};
