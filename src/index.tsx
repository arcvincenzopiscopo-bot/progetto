import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Clear all caches on app startup to prevent loading old versions
const clearAllCaches = async () => {
  try {
    // Clear CacheStorage (Service Worker caches)
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('🧹 Cleared CacheStorage caches:', cacheNames.length);
    }

    // Clear localStorage (except for user preferences and auth data)
    // Keep only essential data, clear everything else
    const localKeysToKeep = ['user', 'theme']; // Add any keys you want to preserve
    const allLocalKeys = Object.keys(localStorage);

    allLocalKeys.forEach(key => {
      if (!localKeysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });

    // Clear sessionStorage (except for authentication data)
    // Keep currentUser for authentication persistence
    const sessionKeysToKeep = ['currentUser'];
    const allSessionKeys = Object.keys(sessionStorage);

    allSessionKeys.forEach(key => {
      if (!sessionKeysToKeep.includes(key)) {
        sessionStorage.removeItem(key);
      }
    });

    console.log('🧹 Cleared browser storage (preserved auth data)');
  } catch (error) {
    console.warn('⚠️ Error clearing caches:', error);
  }
};

// Clear caches on app startup
clearAllCaches();

// Clear geocoding caches on app startup
const clearGeocodingCaches = async () => {
  try {
    // Import and clear geocoding caches dynamically
    const { clearGeocodingCache, clearSearchCache } = await import('./services/geocodingService');
    clearGeocodingCache();
    clearSearchCache();
    console.log('🧹 Geocoding caches cleared on app startup');
  } catch (error) {
    console.warn('⚠️ Could not clear geocoding caches:', error);
  }
};

clearGeocodingCaches();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Service worker disabled - no caching functionality
