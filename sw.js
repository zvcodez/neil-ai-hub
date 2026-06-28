// Service worker for Neil AI Hub.
// Network-first for app assets so deployed updates show up immediately when
// online, with a cached fallback so the app still works offline.
const CACHE = 'neil-ai-hub-v16';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './vendor/react.production.min.js',
  './vendor/react-dom.production.min.js',
  './vendor/htm.umd.js',
  './icons/icon.svg',
  './js/core.js',
  './js/components.js',
  './js/collection.js',
  './js/github.js',
  './js/sync.js',
  './js/main.js',
  './js/tabs/projects.js',
  './js/tabs/timeline.js',
  './js/tabs/glossary.js',
  './js/tabs/shortcuts.js',
  './js/tabs/resources.js',
  './js/tabs/ideas.js',
  './js/tabs/career.js',
  './js/tabs/skills.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Never touch GitHub API responses — always go to network.
  if (url.hostname === 'api.github.com') return;
  if (url.origin !== self.location.origin) return;

  // Network-first: fresh content when online, cache fallback when offline.
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((cached) => cached || caches.match('./index.html')))
  );
});
