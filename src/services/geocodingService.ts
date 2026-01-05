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

/**
 * Search for addresses using Nominatim search API with enhanced house number support
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
      console.log('Using cached search results for:', trimmedQuery);
    }
    return cached;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for enhanced search

    // Check if query contains a house number (digit at the end)
    const houseNumberMatch = trimmedQuery.match(/(\d+)\s*$/);
    const hasHouseNumber = !!houseNumberMatch;
    const houseNumber = houseNumberMatch ? houseNumberMatch[1] : null;
    const baseQuery = hasHouseNumber ? trimmedQuery.replace(/\s+\d+\s*$/, '').trim() : trimmedQuery;

    let allResults: SearchResult[] = [];

    // First, search for the base address (without house number if present)
    const baseSearchParams = new URLSearchParams({
      q: baseQuery,
      format: 'json',
      addressdetails: '1',
      limit: hasHouseNumber ? '20' : '12', // More results when looking for specific house number
      countrycodes: 'IT',
      'accept-language': 'it,en',
      bounded: '1',
      viewbox: '6.627,47.092,18.521,36.619',
      dedupe: '1',
      extratags: '1'
    });

    const baseUrl = `https://nominatim.openstreetmap.org/search?${baseSearchParams.toString()}`;

    if (process.env.NODE_ENV === 'development') {
      console.log('Searching for base address:', baseQuery);
    }

    const baseResponse = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PuntiInteresseApp/1.0 (contact@puntiinteresse.it)'
      },
      signal: controller.signal
    });

    if (baseResponse.ok) {
      const baseData: SearchResult[] = await baseResponse.json();
      allResults = baseData;

      // If user specified a house number, try to find or create specific results
      if (hasHouseNumber && houseNumber) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Looking for house number:', houseNumber, 'in results');
        }

        // Check if any results already have the exact house number
        const exactMatches = baseData.filter(result =>
          result.address.house_number === houseNumber
        );

        if (exactMatches.length > 0) {
          // Prioritize exact matches
          allResults = [
            ...exactMatches,
            ...baseData.filter(result => result.address.house_number !== houseNumber)
          ];
        } else {
          // Try a more specific search with the house number
          const specificSearchParams = new URLSearchParams({
            q: trimmedQuery,
            format: 'json',
            addressdetails: '1',
            limit: '10',
            countrycodes: 'IT',
            'accept-language': 'it,en',
            bounded: '1',
            viewbox: '6.627,47.092,18.521,36.619',
            dedupe: '1',
            extratags: '1'
          });

          try {
            const specificUrl = `https://nominatim.openstreetmap.org/search?${specificSearchParams.toString()}`;
            const specificResponse = await fetch(specificUrl, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'PuntiInteresseApp/1.0 (contact@puntiinteresse.it)'
              },
              signal: controller.signal
            });

            if (specificResponse.ok) {
              const specificData: SearchResult[] = await specificResponse.json();
              if (specificData.length > 0) {
                // Add specific results and remove duplicates
                const combinedResults = [...specificData];
                baseData.forEach(baseResult => {
                  if (!combinedResults.some(specificResult =>
                    specificResult.place_id === baseResult.place_id
                  )) {
                    combinedResults.push(baseResult);
                  }
                });
                allResults = combinedResults;
              }
            }
          } catch (specificError) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('Specific house number search failed:', specificError);
            }
            // Continue with base results
          }
        }
      }
    }

    clearTimeout(timeoutId);

    // Limit final results to 12 for UI
    const finalResults = allResults.slice(0, 12);

    // Cache successful results
    searchCache.set(trimmedQuery, finalResults);

    if (process.env.NODE_ENV === 'development') {
      console.log(`Found ${finalResults.length} search results for "${trimmedQuery}" (house number: ${hasHouseNumber ? houseNumber : 'none'})`);
    }

    return finalResults;

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
