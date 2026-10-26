// Never cache participant APIs, session cookies or Supabase responses.
const CACHE = 'treasure-offline-v1', PREFIX = 'treasure-offline-', OFFLINE = '/offline.html';
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([
  OFFLINE, '/icons/app-192.png', '/icons/app-512.png',
]))));
// Updates activate after old windows close; never reload an active exhibition session.
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') event.respondWith(fetch(request).catch(async () => await caches.match(OFFLINE) || new Response('Internet connection required.', { status: 503 })));
});
