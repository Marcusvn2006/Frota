const CACHE = "reservarcarro-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(["/login"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Don't intercept external requests (Supabase, fonts, etc.)
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        // Cache static assets indefinitely (they are content-hashed by Next.js)
        if (response.ok && url.pathname.startsWith("/_next/static")) {
          caches
            .open(CACHE)
            .then((cache) => cache.put(event.request, response.clone()));
        }
        return response;
      });

      return cached || networkFetch.catch(() => caches.match("/login"));
    })
  );
});
