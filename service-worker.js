const CACHE_NAME = "ht-app-v2";

const urlsToCache = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.json"
];

// INSTALL
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.all(
          urlsToCache.map(url =>
            fetch(url).then(response => {
              if (!response.ok) {
                throw new Error(`Failed: ${url}`);
              }
              return cache.put(url, response);
            })
          )
        );
      })
      .catch(err => console.error("Cache failed:", err))
  );
});

// FETCH
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(res => res || fetch(event.request))
  );
});
