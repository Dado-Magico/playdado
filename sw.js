// Service worker: salva i file al primo avvio così il gioco funziona anche senza internet.
// La pagina (index.html) viene sempre cercata prima in rete: se c'è internet si vede subito
// l'ultima versione, se manca internet si usa la copia salvata.
// Quando cambi qualcosa nell'app, aumenta il numero di VERSION.
var VERSION = 'dado-magico-v16';
var FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png',
  'fonts/dm-sans-latin-400-normal.woff2', 'fonts/dm-sans-latin-500-normal.woff2',
  'fonts/dm-sans-latin-700-normal.woff2', 'fonts/young-serif-latin-400-normal.woff2'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    // cache: 'reload' = scarica davvero i file dalla rete, senza usare copie vecchie del browser
    return Promise.all(FILES.map(function (f) {
      return fetch(new Request(f, { cache: 'reload' })).then(function (r) {
        if (!r.ok) throw new Error('Errore ' + r.status + ' su ' + f);
        return c.put(f, r);
      });
    }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var isPage = req.mode === 'navigate' || req.destination === 'document';
  if (isPage) {
    // pagina: prima la rete (versione piu' recente), poi la copia salvata
    e.respondWith(
      fetch(new Request(req.url, { cache: 'no-cache' })).then(function (r) {
        if (r && r.ok) { var copy = r.clone(); caches.open(VERSION).then(function (c) { c.put('index.html', copy); }); }
        return r;
      }).catch(function () {
        return caches.match('index.html').then(function (hit) { return hit || caches.match('./'); });
      })
    );
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || fetch(req); }));
});
