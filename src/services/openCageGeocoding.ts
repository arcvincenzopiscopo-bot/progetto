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

export const openCageGeocoding = async (query: string): Promise<GeocodingResult> => {
  const apiKey = process.env.REACT_APP_OPENCAGE_API_KEY;

  if (!apiKey) {
    throw new Error('OpenCage API key not configured');
  }

  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&key=${apiKey}&limit=1&language=it&countrycode=IT`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`OpenCage API error: ${response.status}`);
  }

  if (!data.results || data.results.length === 0) {
    throw new Error('OpenCage: No results found');
  }

  const result = data.results[0];
  const components = result.components;

  return {
    lat: result.geometry.lat,
    lng: result.geometry.lng,
    address: result.formatted,
    houseNumber: components.house_number,
    street: components.road || components.footway || components.path,
    city: components.city || components.town || components.village,
    country: components.country,
    source: 'opencage'
  };
};
