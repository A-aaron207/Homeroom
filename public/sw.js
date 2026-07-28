const CACHE_NAME = 'homeroom-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/auth.html',
    '/approve.html',
    '/manifest.json',
    '/css/styles.css',
    '/js/api.js',
    '/js/auth.js',
    '/js/store.js',
    '/js/app.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    
    if (url.pathname.startsWith('/api')) {
        e.respondWith(
            fetch(e.request).catch(() => {
                return new Response(JSON.stringify({ success: false, message: 'Offline mode' }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }
    
    e.respondWith(
        caches.match(e.request).then((res) => {
            return res || fetch(e.request).then((fetchRes) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    if (e.request.method === 'GET') {
                        cache.put(e.request, fetchRes.clone());
                    }
                    return fetchRes;
                });
            });
        })
    );
});
