/**
 * Geocoding Service using cascaded APIs: Google Maps → OpenCage → Photon → Nominatim
 * Provides forward and reverse geocoding with house number support
 */

import { googleMapsGeocoding } from './googleMapsGeocoding';
import { openCageGeocoding } from './openCageGeocoding';
import { photonGeocoding } from './photonGeocoding';

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

interface SearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    house_number?: string;
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
  importance?: number;
  boundingbox?: string[];
}

/**
 * Format address from Nominatim response
 * @param data Nominatim response data
 * @returns Formatted address string
 */
function formatAddressFromNominatim(data: NominatimResponse): string {
  const parts: string[] = [];

  // Build address with house number first (for reverse geocoding when clicking on map)
  let addressPart = '';

  // Add road and house number together
  if (data.address.road) {
    addressPart = data.address.road;
    if (data.address.house_number) {
      addressPart += ` ${data.address.house_number}`;
    }
    parts.push(addressPart);
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

  // Add country if available (only if not Italy, to keep it clean)
  if (data.address.country && data.address.country !== 'Italia') {
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

// Cache for search results
class SearchCache {
  private cache: Map<string, { results: SearchResult[]; timestamp: number }> = new Map();
  private readonly maxSize = 50; // Limit cache size for search queries
  private readonly ttl = 15 * 60 * 1000; // 15 minutes TTL for search results

  get(query: string): SearchResult[] | undefined {
    const entry = this.cache.get(query.toLowerCase().trim());

    if (!entry) return undefined;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(query.toLowerCase().trim());
      return undefined;
    }

    return entry.results;
  }

  set(query: string, results: SearchResult[]): void {
    const key = query.toLowerCase().trim();

    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, { results, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

const searchCache = new SearchCache();

export function getCachedAddress(lat: number, lng: number): GeocodingResult | undefined {
  return geocodingCache.get(lat, lng);
}

export function cacheAddress(lat: number, lng: number, result: GeocodingResult): void {
  geocodingCache.set(lat, lng, result);
}

/**
 * Get address with cascaded reverse geocoding: Google Maps → OpenCage → Photon → Nominatim
 */
export async function getAddressWithCache(lat: number, lng: number): Promise<GeocodingResult> {
  // Try cache first
  const cached = geocodingCache.get(lat, lng);
  if (cached) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Using cached reverse geocoding result for:', lat, lng);
    }
    return cached;
  }

  console.log('🔍 [REVERSE] Starting cascaded reverse geocoding for:', lat, lng);

  // Create a text query for forward geocoding (since our cascaded system is forward-only)
  // We'll search for coordinates formatted as text
  const coordinateQuery = `${lat.toFixed(6)},${lng.toFixed(6)}`;

  try {
    // 1. Try Google Maps reverse geocoding
    console.log('🔍 [REVERSE] Trying Google Maps...');

    try {
      const googleResult = await googleMapsGeocoding(coordinateQuery);

      const result: GeocodingResult = {
        success: true,
        address: googleResult.address,
        fullAddress: googleResult.address,
        rawData: googleResult
      };

      console.log('✅ [REVERSE] Google Maps found:', googleResult.address);
      geocodingCache.set(lat, lng, result);
      return result;

    } catch (googleError) {
      const errorMessage = googleError instanceof Error ? googleError.message : 'Unknown Google Maps error';
      console.warn('❌ [REVERSE] Google Maps failed:', errorMessage);
    }

    // 2. Fallback to OpenCage
    console.log('🔍 [REVERSE] Trying OpenCage...');

    try {
      const openCageResult = await openCageGeocoding(coordinateQuery);

      const result: GeocodingResult = {
        success: true,
        address: openCageResult.address,
        fullAddress: openCageResult.address,
        rawData: openCageResult
      };

      console.log('✅ [REVERSE] OpenCage found:', openCageResult.address);
      geocodingCache.set(lat, lng, result);
      return result;

    } catch (openCageError) {
      const errorMessage = openCageError instanceof Error ? openCageError.message : 'Unknown OpenCage error';
      console.warn('❌ [REVERSE] OpenCage failed:', errorMessage);
    }

    // 3. Final fallback to Photon
    console.log('🔍 [REVERSE] Trying Photon...');

    try {
      const photonResult = await photonGeocoding(coordinateQuery);

      const result: GeocodingResult = {
        success: true,
        address: photonResult.address,
        fullAddress: photonResult.address,
        rawData: photonResult
      };

      console.log('✅ [REVERSE] Photon found:', photonResult.address);
      geocodingCache.set(lat, lng, result);
      return result;

    } catch (photonError) {
      const errorMessage = photonError instanceof Error ? photonError.message : 'Unknown Photon error';
      console.warn('❌ [REVERSE] Photon failed:', errorMessage);
    }

    // 4. Ultimate fallback to Nominatim (original logic)
    console.log('🔍 [REVERSE] Using Nominatim fallback...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

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

    console.log('✅ [REVERSE] Nominatim found:', formattedAddress);
    geocodingCache.set(lat, lng, result);
    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown geocoding error';

    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('❌ [REVERSE] Request timed out for:', lat, lng);
    } else {
      console.error('❌ [REVERSE] All geocoding services failed:', errorMessage);
    }

    // Return fallback result without caching errors
    const fallbackResult: GeocodingResult = {
      success: false,
      error: errorMessage,
      address: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`
    };

    return fallbackResult;
  }
}

/**
 * Search for addresses using cascaded APIs: Google Maps → OpenCage → Photon → Nominatim
 * Provides enhanced geocoding with house number support for Italian addresses
 * @param query The search query (address, place name, etc.)
 * @returns Promise<SearchResult[]> Array of search results
 */
export async function searchAddress(query: string): Promise<SearchResult[]> {
  // Validate input
  const trimmedQuery = query.trim();
  if (!trimmedQuery || trimmedQuery.length < 2) {
    return [];
  }

  // Try cache first
  const cached = searchCache.get(trimmedQuery);
  if (cached) {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Using cached search results for:', trimmedQuery);
    }
    return cached;
  }

  try {
    // 1. Try Google Maps first (highest accuracy for Italian addresses)
    console.log('🔍 [CASCATA] Trying Google Maps geocoding for:', trimmedQuery);

    try {
      const googleResult = await googleMapsGeocoding(trimmedQuery);

      const result: SearchResult = {
        place_id: Date.now(), // Generate unique ID
        lat: googleResult.lat.toString(),
        lon: googleResult.lng.toString(),
        display_name: googleResult.address,
        address: {
          house_number: googleResult.houseNumber,
          road: googleResult.street,
          city: googleResult.city,
          country: googleResult.country || 'Italia'
        },
        importance: 1.0
      };

      const finalResults = [result];
      searchCache.set(trimmedQuery, finalResults);

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Google Maps found result:', googleResult.address);
      }

      return finalResults;

    } catch (googleError) {
      const errorMessage = googleError instanceof Error ? googleError.message : 'Unknown Google Maps error';
      if (process.env.NODE_ENV === 'development') {
        console.warn('❌ Google Maps failed:', errorMessage);
      }
    }

    // 2. Fallback to OpenCage
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Trying OpenCage geocoding...');
    }

    try {
      const openCageResult = await openCageGeocoding(trimmedQuery);

      const result: SearchResult = {
        place_id: Date.now(),
        lat: openCageResult.lat.toString(),
        lon: openCageResult.lng.toString(),
        display_name: openCageResult.address,
        address: {
          house_number: openCageResult.houseNumber,
          road: openCageResult.street,
          city: openCageResult.city,
          country: openCageResult.country || 'Italia'
        },
        importance: 0.8
      };

      const finalResults = [result];
      searchCache.set(trimmedQuery, finalResults);

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ OpenCage found result:', openCageResult.address);
      }

      return finalResults;

    } catch (openCageError) {
      const errorMessage = openCageError instanceof Error ? openCageError.message : 'Unknown OpenCage error';
      if (process.env.NODE_ENV === 'development') {
        console.warn('❌ OpenCage failed:', errorMessage);
      }
    }

    // 3. Final fallback to Photon
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Trying Photon geocoding...');
    }

    try {
      const photonResult = await photonGeocoding(trimmedQuery);

      const result: SearchResult = {
        place_id: Date.now(),
        lat: photonResult.lat.toString(),
        lon: photonResult.lng.toString(),
        display_name: photonResult.address,
        address: {
          house_number: photonResult.houseNumber,
          road: photonResult.street,
          city: photonResult.city,
          country: photonResult.country
        },
        importance: 0.6
      };

      const finalResults = [result];
      searchCache.set(trimmedQuery, finalResults);

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Photon found result:', photonResult.address);
      }

      return finalResults;

    } catch (photonError) {
      const errorMessage = photonError instanceof Error ? photonError.message : 'Unknown Photon error';
      if (process.env.NODE_ENV === 'development') {
        console.warn('❌ Photon failed:', errorMessage);
      }

      // Photon spesso fallisce, andiamo direttamente a Nominatim
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Using Nominatim as final fallback...');
      }
      return await searchWithNominatim(trimmedQuery);
    }

    // This should never be reached due to Photon fallback above, but just in case
    return [];

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown search error';

    if (error instanceof Error && error.name === 'AbortError') {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Search request timed out for:', trimmedQuery);
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.error('Search error:', errorMessage);
      }
    }

    // Return empty array on error (don't cache errors)
    return [];
  }
}

/**
 * Fallback search using Nominatim (existing logic)
 */
async function searchWithNominatim(query: string): Promise<SearchResult[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const searchParams = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '5',
      countrycodes: 'IT',
      'accept-language': 'it,en',
      bounded: '1',
      viewbox: '6.627,47.092,18.521,36.619'
    });

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PuntiInteresseApp/1.0 (contact@puntiinteresse.it)'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data: SearchResult[] = await response.json();

      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Nominatim found ${data.length} results`);
      }

      // Cache and return results
      searchCache.set(query, data);
      return data.slice(0, 5); // Limit to 5 for fallback
    }

    return [];

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('❌ Nominatim fallback failed:', error);
    }
    return [];
  }
}

/**
 * Format search result for display with house number support
 * @param result Search result from Nominatim
 * @returns Formatted display string
 */
export function formatSearchResult(result: SearchResult): string {
  const parts: string[] = [];

  // Build address with house number first
  let addressPart = '';

  // Add road and house number together
  if (result.address.road) {
    addressPart = result.address.road;
    if (result.address.house_number) {
      addressPart += ` ${result.address.house_number}`;
    }
    parts.push(addressPart);
  }

  // Add city/town/village
  if (result.address.city) {
    parts.push(result.address.city);
  } else if (result.address.town) {
    parts.push(result.address.town);
  } else if (result.address.village) {
    parts.push(result.address.village);
  }

  // Add postcode if available
  if (result.address.postcode) {
    parts.push(result.address.postcode);
  }

  // Add state if different from city
  if (result.address.state && result.address.state !== result.address.city) {
    parts.push(result.address.state);
  }

  // If we have parts, join them, otherwise return display_name (truncated)
  if (parts.length > 0) {
    return parts.join(', ');
  } else {
    // Truncate display_name if too long
    const displayName = result.display_name;
    return displayName.length > 60 ? displayName.substring(0, 57) + '...' : displayName;
  }
}
