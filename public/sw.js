// MANG Service Worker v5.0.0 — Stratégie Network-First & Purge Automatique de Cache
const CACHE_NAME = 'mang-cache-v5.0.0';

// Uniquement les ressources statiques publiques garanties (aucun bundle JS avec hash variable)
const STATIC_ASSETS = [
  '/favicon.png',
  '/logo-mang.png',
  '/manifest.json'
];

// Installation : préchargement des ressources statiques de base
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

// Activation : suppression radicale de TOUS les anciens caches corrompus ou obsolètes
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('[MANG SW] Nettoyage ancien cache :', key);
          return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interception des requêtes :
// 1. Pour les pages HTML / Navigation -> Toujours NETWORK-FIRST pour obtenir le dernier index.html
// 2. Pour les assets -> Network avec cache de secours
// 3. Ne JAMAIS renvoyer index.html en secours pour un fichier .js ou .css (évite le SyntaxError: Unexpected token '<')
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignorer les requêtes non-GET et les requêtes Supabase/externes d'API
  if (req.method !== 'GET' || !url.origin.includes(self.location.origin)) {
    return;
  }

  // Requête de navigation (chargement d'une page HTML dans le navigateur)
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Autres requêtes (images, styles, scripts)
  event.respondWith(
    caches.match(req).then(cachedResponse => {
      if (cachedResponse) {
        // En arrière-plan, rafraîchir la ressource
        fetch(req).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(req, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(req).then(networkResponse => {
        // Mettre en cache les images ou ressources statiques valides
        if (networkResponse && networkResponse.status === 200 && (req.destination === 'image' || req.destination === 'font')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, responseToCache));
        }
        return networkResponse;
      });
    })
  );
});

// Écouteur pour recevoir la notification Web Push
self.addEventListener('push', event => {
  if (event.data) {
    let data = {};
    try {
      data = event.data.json();
    } catch(e) {
      data = { title: 'MANG Africa', body: event.data.text() };
    }
    const title = data.title || 'MANG Africa';
    const options = {
      body: data.body || 'Vous avez une nouvelle notification',
      icon: data.icon || '/logo-mang.png',
      badge: '/logo-mang.png',
      data: data.url || '/',
      vibrate: [200, 100, 200, 100, 200, 100, 200],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Écouteur pour le clic sur la notification
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = event.notification.data || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let client of windowClients) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
