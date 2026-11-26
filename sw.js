// ---------------------------------------------------------------
// Service Worker de MACLIVE (mismo esquema que GIDT)
// Estrategia "network-first": siempre intenta traer la versión más
// reciente de cada archivo desde la red; solo recurre a la caché
// como respaldo si no hay conexión. La detección de versiones nuevas
// la hace js/actualizaciones.js con version.json, así que este archivo
// NO hay que tocarlo al publicar una versión.
// ---------------------------------------------------------------
const CACHE_NAME = 'maclive-shell-v1';

const ASSETS_ESENCIALES = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_ESENCIALES))
      .catch(() => {}) // si falla el precache no bloqueamos la instalación
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(
        claves.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // version.json nunca se sirve desde caché: tiene que llegar siempre fresco
  // para que la detección de actualizaciones funcione.
  if (event.request.url.includes('version.json')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Los datos de Supabase (avisos, partes, fotos…) siempre van en vivo:
  // ni se interceptan ni se guardan en caché.
  if (event.request.url.includes('.supabase.co')) return;

  event.respondWith(
    fetch(event.request)
      .then((respuesta) => {
        if (respuesta && respuesta.ok) {
          const copia = respuesta.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia)).catch(() => {});
        }
        return respuesta;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
