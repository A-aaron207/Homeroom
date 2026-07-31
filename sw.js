const CACHE_NAME = 'homeroom-v1.1.0';
const OFFLINE_URL = './offline.html';

const STATIC_ASSETS = [
    './',
    './index.html',
    './auth.html',
    './approve.html',
    './offline.html',
    './favicon.ico',
    './favicon.png',
    './favicon.svg',
    './manifest.json',
    './css/styles.css',
    './icons/icon-48.png',
    './icons/icon-72.png',
    './icons/icon-96.png',
    './icons/icon-128.png',
    './icons/icon-144.png',
    './icons/icon-152.png',
    './icons/icon-192.png',
    './icons/icon-384.png',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png',
    './icons/apple-touch-icon.png',
    './js/firebase-config.js',
    './js/api.js',
    './js/auth.js',
    './js/offline_db.js',
    './js/store.js',
    './js/app.js',
    './js/pages/home.js',
    './js/pages/notes.js',
    './js/pages/chats.js',
    './js/pages/qna.js',
    './js/pages/community.js',
    './js/pages/tasks.js',
    './js/pages/leaderboard.js',
    './js/pages/marketplace.js',
    './js/pages/wallet.js',
    './js/pages/profile.js',
    './js/pages/settings.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install Event - Pre-cache Application Shell & Offline Page
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Pre-caching static application shell');
            return cache.addAll(STATIC_ASSETS);
        }).catch((err) => {
            console.warn('[SW] Cache addAll warning:', err);
        })
    );
    self.skipWaiting();
});

// Activate Event - Clear Old Caches & Claim Clients
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Clearing old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Message Event - Skip Waiting Command for App Updates
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Fetch Event - Routing & Caching Strategies
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Skip non-GET requests for cache matching
    if (request.method !== 'GET') {
        return;
    }

    // API Calls Strategy: Network First with JSON fallback
    if (url.pathname.startsWith('/api')) {
        event.respondWith(
            fetch(request).then((networkResponse) => {
                // Clone and cache successful API responses
                if (networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                }
                return networkResponse;
            }).catch(async () => {
                const cachedResponse = await caches.match(request);
                if (cachedResponse) {
                    return cachedResponse;
                }
                return new Response(JSON.stringify({
                    success: false,
                    offline: true,
                    message: 'You are operating in offline mode. Cached content loaded.'
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    // HTML Navigation Requests Strategy: Network First, fallback to cached page or offline.html
    if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            fetch(request).catch(async () => {
                const cachedResponse = await caches.match(request);
                if (cachedResponse) {
                    return cachedResponse;
                }
                const offlinePage = await caches.match(OFFLINE_URL);
                return offlinePage || caches.match('./index.html');
            })
        );
        return;
    }

    // Static Assets Strategy (JS, CSS, Fonts, Icons): Cache First with Network Fallback & Update
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                // Fetch in background to keep cache fresh
                fetch(request).then((networkResponse) => {
                    if (networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
                    }
                }).catch(() => {});
                return cachedResponse;
            }

            return fetch(request).then((networkResponse) => {
                if (networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                }
                return networkResponse;
            });
        })
    );
});

// Background Sync Handler for Offline Sync Queue
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-offline-queue') {
        event.waitUntil(
            self.clients.matchAll().then((clients) => {
                clients.forEach((client) => {
                    client.postMessage({ type: 'PROCESS_OFFLINE_QUEUE' });
                });
            })
        );
    }
});

// Push Notifications Event Handler
self.addEventListener('push', (event) => {
    let payload = { title: 'Homeroom Notification', body: 'You have a new update in your Homeroom class!', icon: './icons/icon-192.png' };
    if (event.data) {
        try {
            payload = event.data.json();
        } catch (e) {
            payload.body = event.data.text();
        }
    }

    const options = {
        body: payload.body,
        icon: payload.icon || './icons/icon-192.png',
        badge: './icons/icon-96.png',
        vibrate: [100, 50, 100],
        data: payload.data || { url: './index.html' },
        actions: payload.actions || [
            { action: 'open', title: 'Open Homeroom' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(payload.title, options)
    );
});

// Notification Click Event Handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.action === 'dismiss') return;

    const targetUrl = event.notification.data?.url || './index.html';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes('index.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});
