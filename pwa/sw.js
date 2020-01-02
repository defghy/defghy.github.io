var CACHE_NAME = 'cachev1';
var urlsToCache = [
  '/pwa/',
  '/pwa/index.html',
  '/pwa/imgs/q1.png',
  '/pwa/imgs/q_stack.png'
];
var dict = urlsToCache.reduce((data, item) => {
  data[item] = true;
  return data;
}, {});

function needCache(url) {
  url = url.toLowerCase();
  var pathname = url.match(/http[s]*\:\/\/[^\/]+(\/.+)/);
  pathname = pathname && pathname[1];
  return dict[pathname];
}

function fetchRequest({ request, cache }) {
  var request2 = request.clone();
  return fetch(request2).then(function(response) {
    // Check if we received a valid response
    if(!response || response.status !== 200 || response.type !== 'basic') {
      return response;
    }

    // IMPORTANT:Clone the response. A response is a stream
    // and because we want the browser to consume the response
    // as well as the cache consuming the response, we need
    // to clone it so we have two streams.
    var responseToCache = response.clone();
    cache.put(request, responseToCache);

    return response;
  });
}

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
  event.respondWith(caches.open(CACHE_NAME).then(function (cache) {
    return cache.match(request).then(function (response) {
        if (response && response.ok) {
            // if (cacheType.type === CACHE_TYPES.PREV_CACHE) {
            //     fetchRequest({ request, cache });
            // }
            return response;
        } else {
            return fetchRequest({ request, cache });
        }
    });
  }));
});
