const CACHE_NAME = 'pyteen-v1';

const PRECACHE_ASSETS = ['/', '/index.html'];

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>אין חיבור - פייתון בקלות</title>
  <style>
    body { margin:0; min-height:100vh; display:flex; flex-direction:column;
           align-items:center; justify-content:center; background:#0f172a;
           color:#f8fafc; font-family:system-ui,sans-serif; text-align:center;
           padding:2rem; box-sizing:border-box; }
    h1 { color:#38bdf8; font-size:2rem; margin-bottom:0.5rem; }
    p  { color:#94a3b8; font-size:1.1rem; max-width:400px; }
    button { margin-top:1.5rem; padding:.75rem 2rem; background:#38bdf8; color:#0f172a;
             border:none; border-radius:8px; font-size:1rem; font-weight:bold; cursor:pointer; }
    button:hover { background:#0ea5e9; }
  </style>
</head>
<body>
  <h1>📡 אין חיבור לאינטרנט</h1>
  <p>כדי לשמור על ההתקדמות שלך – בדוק את החיבור ונסה שוב.</p>
  <button onclick="location.reload()">🔄 נסה שוב</button>
</body>
</html>`;

// ─── Install: pre-cache core assets ────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// ─── Activate: clear stale caches ─────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// ─── Fetch: stale-while-revalidate for pages; skip API calls ──────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return; // always network for API

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Serve from cache immediately, refresh in background
        fetch(event.request)
          .then((resp) => {
            if (resp && resp.status === 200)
              caches.open(CACHE_NAME).then((c) => c.put(event.request, resp.clone()));
          })
          .catch(() => {});
        return cached;
      }

      return fetch(event.request)
        .then((resp) => {
          if (!resp || resp.status !== 200 || resp.type === 'opaque') return resp;
          caches.open(CACHE_NAME).then((c) => c.put(event.request, resp.clone()));
          return resp;
        })
        .catch(() => {
          // Offline fallback for HTML navigation requests
          if (event.request.headers.get('accept')?.includes('text/html'))
            return new Response(OFFLINE_HTML, {
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        });
    })
  );
});
