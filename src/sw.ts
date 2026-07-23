/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

const CACHE = "bloom-v1";

// HTML: network-first so new deploys flow through naturally.
// Everything else (hashed js/css, icons): cache-first — immutable by name.

async function precache(): Promise<void> {
  const cache = await caches.open(CACHE);
  const response = await fetch("/");
  await cache.put("/", response.clone());
  // pull the hashed asset urls out of the built html
  const html = await response.text();
  const assets = [...html.matchAll(/(?:src|href)="(\.?\/[^"]+)"/g)].map((m) => m[1]!);
  await cache.addAll(assets);
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put("/", copy));
          return response;
        })
        .catch(async () => (await caches.match("/")) ?? Response.error()),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
