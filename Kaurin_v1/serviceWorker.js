// serviceWorker.js
self.addEventListener("install", (e) => {
    e.waitUntil(
      caches.open("flowea-cache").then((cache) => {
        return cache.addAll([
          "/",
          "/index.html",
          "/w3.css",
          "/icon-192.png",
          "/icon-512.png"
          // add more files if needed
        ]);
      })
    );
  });
  
  self.addEventListener("fetch", (e) => {
    e.respondWith(
      caches.match(e.request).then((response) => response || fetch(e.request))
    );
  });