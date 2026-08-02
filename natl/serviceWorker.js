// serviceWorker.js
self.addEventListener("install", (e) => {
    e.waitUntil(
      caches.open("natl-cache").then((cache) => {
        return cache.addAll([
          "/",
          "/index.html",
          "/w3.css",
          "/style.css",
          "/script.js",
          "/tab_script.js",
          "/jquery-4.0.0.slim.min.js",
          "/icon-192.png",
          "/icon-512.png"
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