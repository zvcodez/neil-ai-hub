// Service worker for Neil AI Hub.
// Network-first for app assets so deployed updates show up immediately when
// online, with a cached fallback so the app still works offline.
// Bump this on every deploy, and keep BUILD_STAMP in index.html's inline
// script matching it — the visible build stamp (sync panel) is how a
// screenshot proves which build produced it, instead of "did the fix not
// work, or am I looking at a stale cached build" being unanswerable.
const CACHE = 'neil-ai-hub-v59';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './fonts/Sora-500.woff',
  './fonts/Sora-600.woff',
  './fonts/Sora-700.woff',
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
  './js/tabs/home.js',
  './js/tabs/projects.js',
  './js/tabs/timeline.js',
  './js/tabs/glossary.js',
  './js/tabs/resources.js',
  './js/tabs/career.js',
  './js/tabs/skills.js',
  './js/tabs/business.js',
  './js/tabs/growth.js',
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
  // { cache: 'no-store' } bypasses the browser's own HTTP cache (not just this
  // SW's cache) — without it, "network-first" can still silently resolve from
  // an unexpired HTTP cache entry (GitHub Pages sets cache-control on static
  // assets), which is exactly how a stale build can survive a "network-first"
  // fetch and make a real fix look like it didn't ship.
  e.respondWith(
    fetch(e.request, { cache: 'no-store' })
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
