if (navigator.serviceWorker) {
  navigator.serviceWorker.register('./sw.js', {
    scope: './'
  }).then(function(registration) {
    var serviceWorker;
    if (registration.installing) {
      serviceWorker = registration.installing;
      console.log('installing');
    } else if (registration.waiting) {
      serviceWorker = registration.waiting;
      console.log('waiting');
    } else if (registration.active) {
      serviceWorker = registration.active;
      console.log('active');
    }
    if (serviceWorker) {
      serviceWorker.addEventListener('statechange', function (e) {

      });
    }
  }).catch(function(err) {
    console.error('service worker初始化失败: ', err);
  });


  navigator.serviceWorker.addEventListener('message', function (e) {
    if (e.data === 'sw.update') {
       alert('页面有更新');
    }
  });
}
