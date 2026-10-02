/* Cert Gauntlet — service worker. Precache the shell; stale-while-revalidate for everything else on this origin.
   Bump VERSION whenever a deploy should invalidate old caches (the app's VERSION in core/app.js is the same string). */
const VERSION = "cg-2.0.0";
const SHELL = ["./", "./index.html", "./manifest.json", "./core/styles.css", "./core/app.js", "./assets/icon-192.png", "./assets/icon-180.png", "./assets/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return; // GitHub API etc. always go to the network
  e.respondWith(caches.open(VERSION).then(async cache => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const fetching = fetch(e.request).then(res => { if (res && res.ok) cache.put(e.request, res.clone()); return res; }).catch(() => null);
    if (cached) { fetching.catch(() => { }); return cached; }
    const res = await fetching;
    return res || new Response("Offline and not cached yet.", { status: 503, headers: { "Content-Type": "text/plain" } });
  }));
});
self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });
