const CACHE_NAME = 'proyectorpro-v3';
const ASSETS = [
    './',
    './index.html',
    './css/mobile_style.css',
    './js/app_mobile.js',
    './favicon.png'
];

// Instalación: Guardar archivos base
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Activación: Limpiar caches viejas
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
});

// Estrategia: Network First (Priorizar red para tener siempre lo último)
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
