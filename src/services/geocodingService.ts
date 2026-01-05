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
 * Optimized cache for geocoding results to avoid duplicate requests
 * Uses LRU-style eviction and better key management
 */
class GeocodingCache {
  private cache: Map<string, { result: GeocodingResult; timestamp: number }> = new Map();
  private readonly maxSize = 100; // Limit cache size
  private readonly ttl = 30 * 60 * 1000; // 30 minutes TTL

  private generateKey(lat: number, lng: number): string {
    // Use more precise rounding for better cache hits
    return `${lat.toFixed(5)},${lng.toFixed(5)}`;
  }

  get(lat: number, lng: number): GeocodingResult | undefined {
    const key = this.generateKey(lat, lng);
    const entry = this.cache.get(key);

    if (!entry) return undefined;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.result;
  }

  set(lat: number, lng: number, result: GeocodingResult): void {
    const key = this.generateKey(lat, lng);

    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, { result, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

const geocodingCache = new GeocodingCache();

export function getCachedAddress(lat: number, lng: number): GeocodingResult | undefined {
  return geocodingCache.get(lat, lng);
}

export function cacheAddress(lat: number, lng: number, result: GeocodingResult): void {
  geocodingCache.set(lat, lng, result);
}

/**
 * Get address with optimized caching - tries cache first, then makes API call if needed
 */
export async function getAddressWithCache(lat: number, lng: number): Promise<GeocodingResult> {
  // Try cache first
  const cached = geocodingCache.get(lat, lng);
  if (cached) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Using cached geocoding result for:', lat, lng);
    }
    return cached;
  }

  // If not in cache, make API call with timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PuntiInteresseApp/1.0 (contact@puntiinteresse.it)'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Nominatim request failed with status ${response.status}`);
    }

    const data: NominatimResponse = await response.json();
    const formattedAddress = formatAddressFromNominatim(data);
    const fullAddress = data.display_name;

    const result: GeocodingResult = {
      success: true,
      address: formattedAddress,
      fullAddress: fullAddress,
      rawData: data
    };

    // Cache successful results
    geocodingCache.set(lat, lng, result);
    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown geocoding error';

    if (error instanceof Error && error.name === 'AbortError') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Geocoding request timed out for:', lat, lng);
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.error('Geocoding error:', errorMessage);
      }
    }

    // Return fallback result without caching errors
    return {
      success: false,
      error: errorMessage,
      address: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`
    };
  }
}
