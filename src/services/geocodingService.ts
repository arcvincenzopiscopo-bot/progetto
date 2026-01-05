/**
 * Geocoding Service using OpenStreetMap Nominatim
 * Provides reverse geocoding functionality (coordinates to address)
 */

interface NominatimResponse {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
    [key: string]: string | undefined;
  };
  boundingbox?: string[];
}

interface GeocodingResult {
  success: boolean;
  address?: string;
  fullAddress?: string;
  error?: string;
  rawData?: any;
}

/**
 * Reverse geocode coordinates to get human-readable address
 * @param lat Latitude
 * @param lng Longitude
 * @returns Promise with geocoding result
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodingResult> {
  try {
    // Validate coordinates
    if (isNaN(lat) || isNaN(lng)) {
      return {
        success: false,
        error: 'Invalid coordinates',
        address: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`
      };
    }

    // Build Nominatim API URL
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

    // Make the request to Nominatim
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PuntiInteresseApp/1.0 (contact@puntiinteresse.it)'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim request failed with status ${response.status}`);
    }

    const data: NominatimResponse = await response.json();

    // Extract and format the address
    const formattedAddress = formatAddressFromNominatim(data);
    const fullAddress = data.display_name;

    return {
      success: true,
      address: formattedAddress,
      fullAddress: fullAddress,
      rawData: data
    };

  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown geocoding error',
      address: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`
    };
  }
}

/**
 * Format address from Nominatim response
 * @param data Nominatim response data
 * @returns Formatted address string
 */
function formatAddressFromNominatim(data: NominatimResponse): string {
  const parts: string[] = [];

  // Add road if available
  if (data.address.road) {
    parts.push(data.address.road);
  }

  // Add city/town/village
  if (data.address.city) {
    parts.push(data.address.city);
  } else if (data.address.town) {
    parts.push(data.address.town);
  } else if (data.address.village) {
    parts.push(data.address.village);
  }

  // Add postcode if available
  if (data.address.postcode) {
    parts.push(data.address.postcode);
  }

  // Add country if available
  if (data.address.country) {
    parts.push(data.address.country);
  }

  // If we have parts, join them, otherwise return display_name
  if (parts.length > 0) {
    return parts.join(', ');
  } else {
    return data.display_name || `Lat: ${data.lat}, Lng: ${data.lon}`;
  }
}

/**
 * Simple cache for geocoding results to avoid duplicate requests
 * @param lat Latitude
 * @param lng Longitude
 * @returns Cached address or undefined if not in cache
 */
const geocodingCache: Map<string, GeocodingResult> = new Map();

export function getCachedAddress(lat: number, lng: number): GeocodingResult | undefined {
  const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  return geocodingCache.get(cacheKey);
}

export function cacheAddress(lat: number, lng: number, result: GeocodingResult): void {
  const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
  geocodingCache.set(cacheKey, result);
}

/**
 * Get address with caching - tries cache first, then makes API call if needed
 */
export async function getAddressWithCache(lat: number, lng: number): Promise<GeocodingResult> {
  // Try cache first
  const cached = getCachedAddress(lat, lng);
  if (cached) {
    return cached;
  }

  // If not in cache, make API call
  const result = await reverseGeocode(lat, lng);

  // Cache the result if successful
  if (result.success) {
    cacheAddress(lat, lng, result);
  }

  return result;
}
