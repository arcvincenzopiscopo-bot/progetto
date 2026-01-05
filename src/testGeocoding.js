/**
 * Simple test script to verify geocoding service works
 * This is a standalone test that can be run in browser console
 */

// Import the geocoding service (this would be done automatically in the app)
import { reverseGeocode, getAddressWithCache } from './services/geocodingService';

// Test coordinates for Rome, Italy
const testLat = 41.9028;
const testLng = 12.4964;

console.log('Testing geocoding service...');

// Test the reverse geocoding function
async function testGeocoding() {
  try {
    console.log('Testing reverseGeocode function...');
    const result = await reverseGeocode(testLat, testLng);
    console.log('Geocoding result:', result);

    if (result.success) {
      console.log('✅ Geocoding successful!');
      console.log('Address:', result.address);
      console.log('Full address:', result.fullAddress);
    } else {
      console.log('❌ Geocoding failed:', result.error);
    }

    // Test the cached version
    console.log('\nTesting getAddressWithCache function...');
    const cachedResult = await getAddressWithCache(testLat, testLng);
    console.log('Cached result:', cachedResult);

    if (cachedResult.success) {
      console.log('✅ Cached geocoding successful!');
      console.log('Cached address:', cachedResult.address);
    } else {
      console.log('❌ Cached geocoding failed:', cachedResult.error);
    }

  } catch (error) {
    console.error('Error testing geocoding:', error);
  }
}

// Run the test
testGeocoding();
