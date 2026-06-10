const CACHE_NAME = "greenmeans-office-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/public/manifest.json",
  "/public/favicon.ico",
  "/public/favicon-16x16.png",
  "/public/favicon-32x32.png",
  "/public/favicon-round.svg",
  "/public/favicon-square.svg",
  "/public/android-chrome-192x192.png",
  "/public/android-chrome-512x512.png",
  "/public/apple-touch-icon.png"
];

// Install: Cache critical shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log("[Service Worker] Caching critical assets");
        // We use catch to prevent the entire block from failing if one asset fails to resolve
        return Promise.allSettled(
          ASSETS.map(asset => {
            return cache.add(asset).catch(err => {
              console.warn(`[Service Worker] Failed to cache: ${asset}`, err);
            });
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: Reclaim control and wipe old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Serve from cache, fallback to network, with stale-while-revalidate fallback
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Avoid caching Chrome extensions, Dev Server internal calls, or metrics tools that should always run fresh
  if (!url.protocol.startsWith("http")) return;
  if (url.host.includes("localhost") || url.host.includes("127.0.0.1") || url.host.includes("vite")) {
    // Avoid caching local dev servers/HMR to prevent visual stale state during development
    return;
  }
  if (url.href.includes("assets_vital_metrics") || url.href.includes("p/Xf3gR3BWj")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve cached resource immediately, and asynchronously refresh cell cache from network in background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Silence network exception for background refreshes when offline
          });
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
            return networkResponse;
          }

          // Cache dynamically fetched CSS, JS, and font resources in basic scopes
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch((err) => {
          // If offline and request is document page navigation, return main index.html
          if (event.request.mode === "navigate") {
            return caches.match("/index.html") || caches.match("/");
          }
          throw err;
        });
    })
  );
});
