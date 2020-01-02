var CACHE_NAME = 'cachev1';
var urlsToCache = [
  '/pwa/',
  '/pwa/index.html',
  '/pwa/imgs/q1.png',
  '/pwa/imgs/q_stack.png'
];

// 添加缓存
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
});

// 拦截请求
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      // Cache hit - return response
      if (response) {
        return response;
      }

      var fetchRequest = event.request.clone();
      return fetch(fetchRequest).then(function(response) {
        // Check if we received a valid response
        if(!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // IMPORTANT:Clone the response. A response is a stream
        // and because we want the browser to consume the response
        // as well as the cache consuming the response, we need
        // to clone it so we have two streams.
        var responseToCache = response.clone();

        caches.open(CACHE_NAME)
          .then(function(cache) {
            cache.put(event.request, responseToCache);
          });

        return response;
      });
    })
  );
});
