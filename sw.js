const CORE_STATIC_CACHE_NAME = "nexus-core-cache-v3";
const INTERCEPT_MANIFEST_ASSETS = [
    "/",
    "/index.html",
    "/style.css",
    "/script.js",
    "/manifest.json",
    "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Plus+Jakarta+Sans:wght@300;400;600;700&display=swap",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
];

// Phase Lifecycle Handler: Installation Sequence Hook
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CORE_STATIC_CACHE_NAME).then((openedCacheInstance) => {
            console.log("Caching physical application shell paths dynamically...");
            return openedCacheInstance.addAll(INTERCEPT_MANIFEST_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Phase Lifecycle Handler: Activation and Cache Purging Configuration Node
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((registeredCacheKeys) => {
            return Promise.all(
                registeredCacheKeys.map((key) => {
                    if (key !== CORE_STATIC_CACHE_NAME) {
                        console.log("De-allocating deprecated legacy assets structure code:", key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Strategy: Network-First falling back gracefully to Cache API Layers
self.addEventListener("fetch", (event) => {
    // Prevent interception failures during cross-origin database streams
    if (event.request.url.includes("firestore.googleapis.com") || event.request.url.includes("firebaseio.com")) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                if (networkResponse.status === 200) {
                    const clonedResponseCopy = networkResponse.clone();
                    caches.open(CORE_STATIC_CACHE_NAME).then((cache) => {
                        cache.put(event.request, clonedResponseCopy);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});

