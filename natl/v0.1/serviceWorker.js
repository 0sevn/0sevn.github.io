// serviceWorker.js
self.addEventListener("install", (e) => {
    e.waitUntil(
      caches.open("natl-cache").then((cache) => {
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
// const CACHE_NAME = "flowea-v1";

//   self.addEventListener("activate", event => {
//     event.waitUntil(
//         caches.keys().then(keys =>
//             Promise.all(
//                 keys
//                     .filter(key => key !== CACHE_NAME)
//                     .map(key => caches.delete(key))
//             )
//         )
//     );

//     self.clients.claim();
// });