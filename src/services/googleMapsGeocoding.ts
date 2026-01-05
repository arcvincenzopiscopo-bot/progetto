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
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error('Google Maps API key not configured');
  }

  // Load Google Maps API dynamically
  if (!window.google?.maps) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geocoding`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps API'));
      document.head.appendChild(script);
    });
  }

  const geocoder = new google.maps.Geocoder();

  return new Promise((resolve, reject) => {
    geocoder.geocode({ address: query }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
      if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
        const result = results[0];

        resolve({
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng(),
          address: result.formatted_address,
          houseNumber: extractHouseNumber(result.address_components),
          street: extractStreet(result.address_components),
          city: extractCity(result.address_components),
          country: extractCountry(result.address_components),
          source: 'google'
        });
      } else {
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
