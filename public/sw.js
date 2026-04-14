const CACHE_VERSION = '17';
const CACHE_NAME = `arrival-dismissal-v${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/display-new.html',
  '/display-new-styles.css',
  '/display-new-script.js',
  '/admin-new.html',
  '/admin-new-styles.css',
  '/admin-new-script.js',
  '/admin-pin.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Install event - cache resources and activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Fetch event - different strategies for different content types
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls - always go to network
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Network-first for HTML pages (navigation requests)
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets (CSS, JS, fonts, images)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return networkResponse;
        });
      })
  );
});

// Activate event - clean up old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Background sync for offline data submission
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle offline submissions when connection is restored
  try {
    const pendingData = await getStoredOfflineData();
    if (pendingData.length > 0) {
      for (const data of pendingData) {
        await fetch(data.url, {
          method: data.method,
          headers: data.headers,
          body: data.body
        });
      }
      await clearStoredOfflineData();
    }
  } catch (error) {
    console.log('Background sync failed:', error);
  }
}

async function getStoredOfflineData() {
  // This would retrieve data from IndexedDB in a real implementation
  return [];
}

async function clearStoredOfflineData() {
  // This would clear data from IndexedDB in a real implementation
}