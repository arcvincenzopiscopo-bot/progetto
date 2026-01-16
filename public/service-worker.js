// Basic Service Worker for PWA functionality
const CACHE_NAME = 'poi-app-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/js/main.*.js',
  '/static/css/main.*.css',
  '/static/js/*.chunk.js',
  '/static/css/*.chunk.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache');
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Cache-first strategy for assets, network-first for API calls
  const requestUrl = new URL(event.request.url);

  // Skip service worker for API calls to avoid caching issues
  if (requestUrl.pathname.startsWith('/api/') ||
      requestUrl.hostname.includes('supabase.co') ||
      requestUrl.hostname.includes('cloudinary.com') ||
      requestUrl.hostname.includes('api.mapbox.com') ||
      requestUrl.hostname.includes('googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached response if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then((response) => {
            // Cache successful responses
            if (response && response.status === 200 && response.type === 'basic') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return response;
          })
          .catch(() => {
            // If both cache and network fail, return a fallback response
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
            return new Response(null, { status: 404 });
          });
      })
  );
});

// Listen for push notifications (if needed in the future)
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon-192x192.png',
    data: data.url
  });
});

// Listen for notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.notification.data) {
    clients.openWindow(event.notification.data);
  }
});
