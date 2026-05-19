/* Service Worker for Fly's Stock Market PWA
 * Strategy:
 *   - app shell (index.html, manifest, sw): network-first, fall back to cache
 *   - everything else (incl. TWSE / Yahoo): network only (always fresh quotes)
 */
const CACHE_NAME = 'fly-stocks-v1';
const APP_SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);
  // Only handle GET, same-origin app shell
  if (evt.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;        // pass-through external API
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/') || url.pathname.endsWith('manifest.json')) {
    evt.respondWith(
      fetch(evt.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(evt.request, copy)).catch(()=>{});
        return resp;
      }).catch(() => caches.match(evt.request).then(r => r || caches.match('./index.html')))
    );
  }
});
