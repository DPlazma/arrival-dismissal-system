const CACHE_NAME = 'arrival-dismissal-v1';
const urlsToCache = [
  '/',
  '/styles.css',
  '/script.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Activate event - clean up old caches
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
    })
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