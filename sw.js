const CACHE_NAME = 'test-results-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './github-sync.js',
  './manifest.json',
  './logo-192.png',
  './logo-512.png'
];

// 1. Install Phase: Save the UI shells (CSS, JS, HTML)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Activate Phase: Clean up old caches if you update the version
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

// 3. Fetch Phase: The Middleman Logic
self.addEventListener('fetch', (event) => {
  // CRITICAL: If the request is for GitHub Data, do NOT use cache.
  // We want the newest test results every time.
  if (event.request.url.includes('api.github.com') || event.request.url.includes('data.json')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For everything else (CSS, Logos, JS), try Network first, fallback to Cache
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
