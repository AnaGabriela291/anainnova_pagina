/* ============================================================
   VOLTX — Service worker
   Cachea el shell de la aplicación para que la PWA del técnico
   y el portal del cliente funcionen con conectividad irregular
   (§8.3). Estrategia: network-first con fallback a caché.
   ============================================================ */
var CACHE = 'voltx-v1';
var SHELL = [
  'index.html', 'login.html', 'app.html', 'tecnico.html', 'cliente.html',
  'css/voltx.css',
  'js/store.js', 'js/ui.js', 'js/app.js',
  'js/views-core.js', 'js/views-ops.js', 'js/views-back.js', 'js/views-admin.js',
  'js/tecnico.js', 'js/cliente.js',
  'manifest.webmanifest'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(SHELL.map(function (u) {
        return c.add(new Request(u, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy).catch(function () {}); });
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        return hit || caches.match('tecnico.html');
      });
    })
  );
});
