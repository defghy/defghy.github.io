debugger;
if (navigator.serviceWorker) {
  navigator.serviceWorker.register('./sw.js').then(function(registration) {
    debugger;
  }).catch(function(err) {
    console.error('service worker初始化失败: ', err);
  });
}
