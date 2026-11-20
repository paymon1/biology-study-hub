"use strict";
const VERSION = "zistyar-pwa-v1";
const BASE = new URL("./", self.location.href);
const CORE = [
  "", "index.html", "manifest.webmanifest", "pwa-icon.svg",
  "assets/stylesheets/extra.css",
  "assets/javascripts/flashcards.js",
  "assets/javascripts/study-tools.js",
  "assets/javascripts/pwa.js",
  "07-revision/study-dashboard/",
  "07-revision/saved-flashcards/"
];
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.all(CORE.map(path => cache.add(new URL(path, BASE).href).catch(() => null)));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("zistyar-pwa-") && key !== VERSION).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE.pathname)) return;
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      } catch (_) {
        return (await cache.match(request)) || (await cache.match(new URL("", BASE).href)) || Response.error();
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(request);
    const network = fetch(request).then(response => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    }).catch(() => null);
    return cached || (await network) || Response.error();
  })());
});