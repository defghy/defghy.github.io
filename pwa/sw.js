// trigger fresh 2020-01-03 19:57
var CACHE_NAME = 'cachev1';

function informUpgrade () {
  self.clients.matchAll().then(function (clients) {
    if (clients && clients.length) {
      clients.forEach(function (client) {
        // 发送字符串'sw.update'
        client.postMessage('sw.update');
      })
    }
  })
}

// 添加缓存
self.addEventListener('install', function(event) {
  const done = caches.open(CACHE_NAME).then(function(cache) {
    return cache.addAll([
      '/pwa/index.html'
    ]);
  }).then(function () {
    return self.skipWaiting();
  });
  event.waitUntil(done);
});

// 更新缓存
self.addEventListener('activate', function(event) {
  const done = caches.delete(CACHE_NAME).then(function() {
    return self.clients.claim()
  }).then(function() {
    informUpgrade();
  })
  event.waitUntil(done);
});

var CACHE_DICT = [
  { test: /\/pwa\/(index\.html)?$/, },
  { test: /^https:.*github.io.*(.jpg|.jpeg|.png)$/, }
];

function needCache(url) {
  url = url.toLowerCase();
  return CACHE_DICT.find(rule => rule.test.test(url));
}

function fetchRequest({ request, cache }) {
  var request2 = request.clone();
  return fetch(request2).then(function(response) {
    // Check if we received a valid response
    if(!response || response.status !== 200 || response.type !== 'basic') {
      return response;
    }

    if (needCache(request.url)) {
      // IMPORTANT:Clone the response. A response is a stream
      // and because we want the browser to consume the response
      // as well as the cache consuming the response, we need
      // to clone it so we have two streams.
      var responseToCache = response.clone();
      cache.put(request, responseToCache);
    }

    return response;
  });
}

// 拦截请求
self.addEventListener('fetch', function(event) {
  let request = event.request;
  if (!needCache(request.url)) {
    return;
  }
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
