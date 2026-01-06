import { incrementGoogleMapsUsage } from './googleMapsCounterService';

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

export const googleMapsGeocoding = async (query: string): Promise<GeocodingResult> => {
  // Log ridotto per sicurezza - solo in sviluppo
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [Google Maps] Starting geocoding request');
  }

  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error('❌ [Google Maps] API key not configured');
    throw new Error('Google Maps API key not configured');
  }

  // Load Google Maps API dynamically
  if (!window.google?.maps) {
    if (process.env.NODE_ENV === 'development') {
      console.log('📦 [Google Maps] Loading Google Maps API script');
    }
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geocoding`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ [Google Maps] API script loaded successfully');
        }
        resolve();
      };
      script.onerror = () => {
        console.error('❌ [Google Maps] Failed to load API script');
        reject(new Error('Failed to load Google Maps API'));
      };
      document.head.appendChild(script);
    });
  } else {
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [Google Maps] API already loaded');
    }
  }

  const geocoder = new google.maps.Geocoder();
  if (process.env.NODE_ENV === 'development') {
    console.log('🔎 [Google Maps] Sending geocoding request');
  }

  return new Promise((resolve, reject) => {
    geocoder.geocode({ address: query }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
      console.log('📡 [Google Maps] Received response - Status:', status);

      if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
        const result = results[0];
        const finalResult = {
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng(),
          address: result.formatted_address,
          houseNumber: extractHouseNumber(result.address_components),
          street: extractStreet(result.address_components),
          city: extractCity(result.address_components),
          country: extractCountry(result.address_components),
          source: 'google'
        };

        console.log('✅ [Google Maps] SUCCESS - Found result:', {
          address: finalResult.address,
          lat: finalResult.lat,
          lng: finalResult.lng,
          houseNumber: finalResult.houseNumber,
          source: finalResult.source
        });

        // Incrementa il contatore delle chiamate Google Maps
        incrementGoogleMapsUsage().catch(error => {
          console.warn('⚠️ [Google Maps] Failed to increment usage counter:', error);
        });

        resolve(finalResult);
      } else {
        console.error('❌ [Google Maps] FAILED - Status:', status, '- No results for query:', query);
        reject(new Error(`Google Maps geocoding failed: ${status}`));
      }
    });
  });
};

// Helper functions to extract address components
const extractHouseNumber = (components: google.maps.GeocoderAddressComponent[]): string | undefined => {
  const component = components.find(c => c.types.includes('street_number'));
  return component?.long_name;
};

const extractStreet = (components: google.maps.GeocoderAddressComponent[]): string | undefined => {
  const component = components.find(c => c.types.includes('route'));
  return component?.long_name;
};

const extractCity = (components: google.maps.GeocoderAddressComponent[]): string | undefined => {
  return components.find(c => c.types.includes('locality'))?.long_name ||
         components.find(c => c.types.includes('administrative_area_level_3'))?.long_name ||
         components.find(c => c.types.includes('administrative_area_level_2'))?.long_name;
};

const extractCountry = (components: google.maps.GeocoderAddressComponent[]): string | undefined => {
  const component = components.find(c => c.types.includes('country'));
  return component?.long_name;
};
