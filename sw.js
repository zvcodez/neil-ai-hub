// Service worker for Neil AI Hub — offline app shell caching.
const CACHE = 'neil-ai-hub-v1';
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
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Never cache GitHub API responses — always fetch fresh.
  if (url.hostname === 'api.github.com') return;
  if (e.request.method !== 'GET') return;

  // Cache-first for same-origin app assets, with background refresh.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const network = fetch(e.request)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(e.request, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
