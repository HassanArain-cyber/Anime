/* ═══════════════════════════════════════════
   MyVault Service Worker — sw.js
   Enables PWA install + offline support
═══════════════════════════════════════════ */

const CACHE_NAME = 'myvault-v1';

// Files to cache for offline use
const CACHE_FILES = [
  './splash.html',
  './index.html',
  './rv.css',
  './rv.js',
  './manifest.json',
  './icon.svg',
  './animevault/index.html',
  './animevault/watchlist.html',
  './animevault/categories.html',
  './animevault/style.css',
  './animevault/app.js',
];

// Install — cache all files
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_FILES).catch(() => {
        // Don't fail install if some files missing
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — serve from cache, fallback to network
self.addEventListener('fetch', e => {
  // Skip non-GET and external requests
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback
        return caches.match('./splash.html');
      });
    })
  );
});
