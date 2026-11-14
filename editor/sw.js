/* Service worker do editor (PWA). Estratégia: rede primeiro, cache como reserva — online você sempre recebe a versão nova
   (sem Ctrl+F5); offline o editor continua abrindo com a última versão vista. Só guarda GET do mesmo site. */
const VERSAO = 'motor-v1';
self.addEventListener('install', e => { e.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', e => { e.waitUntil((async () => { for (const k of await caches.keys()) if (k !== VERSAO) await caches.delete(k); await self.clients.claim(); })()); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    try { const res = await fetch(r); if (res && res.ok) { const c = await caches.open(VERSAO); c.put(r, res.clone()).catch(() => {}); } return res; }
    catch (x) { const m = await caches.match(r, { ignoreSearch: true }); if (m) return m; throw x; }
  })());
});
