const CACHE_NAME = 'proyectorpro-v1';
const ASSETS = [
    './',
    './index.html',
    './css/mobile_style.css',
    './js/app_mobile.js',
    './favicon.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});
