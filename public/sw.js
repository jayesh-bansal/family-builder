/**
 * Kutumb Service Worker — Offline-first caching strategy.
 *
 * Caches:
 * 1. App shell (HTML navigation requests) — Network-first, fallback to cache
 * 2. Static assets (JS, CSS, images, fonts) — Cache-first, fallback to network
 * 3. API / Supabase responses — Network-first, cache response for offline
 * 4. Offline fallback page when completely offline
 */

const CACHE_VERSION = "kutumb-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Static assets to precache on install
const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/favicon.svg",
  "/offline.html",
];

// ─── Install: Precache essential assets ───
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn("SW precache partial failure:", err);
      });
    })
  );
  self.skipWaiting();
});

// ─── Activate: Clean old caches ───
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("kutumb-") && key !== STATIC_CACHE && key !== DYNAMIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch strategies ───
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (mutations must go through network)
  if (request.method !== "GET") return;

  // Skip chrome-extension and other non-http
  if (!url.protocol.startsWith("http")) return;

  // Strategy 1: Supabase API calls — Network-first, cache fallback
  if (url.hostname.includes("supabase.co")) {
    event.respondWith(networkFirstWithCache(request, API_CACHE));
    return;
  }

  // Strategy 2: Next.js data/RSC requests — Network-first, cache fallback
  if (url.pathname.includes("/_next/data/") || request.headers.get("RSC") === "1") {
    event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE));
    return;
  }

  // Strategy 3: Static assets (JS, CSS, images, fonts) — Cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstWithNetwork(request, STATIC_CACHE));
    return;
  }

  // Strategy 4: Navigation requests (HTML pages) — Network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(navigationHandler(request));
    return;
  }

  // Default: Network-first for everything else
  event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE));
});

// ─── Strategy: Network-first, fallback to cache ───
async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ─── Strategy: Cache-first, fallback to network ───
async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("", { status: 503 });
  }
}

// ─── Strategy: Navigation — Network-first with offline.html fallback ───
async function navigationHandler(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Try cached version of this page
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback to offline page
    const offlinePage = await caches.match("/offline.html");
    if (offlinePage) return offlinePage;
    return new Response("You are offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

// ─── Helpers ───
function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    /\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|webp|ico|json)$/.test(pathname)
  );
}

// ─── Message handler for cache management from the app ───
self.addEventListener("message", (event) => {
  if (event.data?.type === "CACHE_TREE_DATA") {
    // Store tree data sent from the client
    const cache_key = "kutumb-tree-data";
    caches.open(API_CACHE).then((cache) => {
      const response = new Response(JSON.stringify(event.data.payload), {
        headers: { "Content-Type": "application/json" },
      });
      cache.put(cache_key, response);
    });
  }

  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
