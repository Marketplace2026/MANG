// ============================================================
// SERVICE WORKER - CACHING POUR L'APPLICATION MANG
// ============================================================

const CACHE_NAME = 'mang-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.png',
];

// Installation : Mise en cache des assets de base
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[MANG SW] Mise en cache des assets statiques de base');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activation : Nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[MANG SW] Nettoyage de l\'ancien cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interception des requêtes réseaux
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // NE PAS CACHER les requêtes vers Supabase API / rest / auth
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // Stratégie CacheFirst pour les polices de caractères, scripts CDN et images locale
  if (
    url.pathname.includes('/assets/') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('unpkg.com') || // Leaflet Map CDN
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Si présent en cache, on retourne immédiatement
          return cachedResponse;
        }

        // Sinon on fetch, on met en cache et on retourne
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
    return;
  }

  // Pour tout le reste (dont index.html), on utilise NetworkFirst
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Mettre à jour le cache principal index
        if (networkResponse && networkResponse.status === 200 && url.origin === self.location.origin) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // En cas de panne réseau complète (hors-ligne), on cherche dans le cache
        return caches.match(event.request);
      })
  );
});
