/* Tiny Wins service worker: offline cache + reminder scheduler. */
const CACHE = 'tinywins-v5';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/actions.js', './js/data.js', './js/logic.js', './js/notify.js', './js/store.js', './js/sync.js', './js/ui.js', './js/util.js',
  './js/views/today.js', './js/views/journey.js', './js/views/progress.js', './js/views/me.js',
  './js/views/onboarding.js', './js/views/sos.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-192.png', './icons/maskable-512.png',
  './icons/apple-touch-icon.png', './icons/badge-96.png',
];

self.addEventListener('install', e => {
  // cache:'reload' bypasses the HTTP cache so a new SW version always grabs fresh files.
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(ASSETS.map(async u => {
      try { const r = await fetch(u, { cache: 'reload' }); if (r.ok) await c.put(u, r); } catch { /* offline install */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

// Stale-while-revalidate: instant from cache, refreshed in the background.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Sync API is always live, never cached.
  if (new URL(req.url).pathname.startsWith('/api/')) return;
  const key = req.mode === 'navigate' ? './index.html' : req;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(key, { ignoreSearch: true });
    const net = fetch(req).then(res => {
      if (res.ok) cache.put(key, res.clone());
      return res;
    }).catch(() => hit);
    return hit || net;
  })());
});

/* ---------- IndexedDB (mirrors js/notify.js) ---------- */
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('tinywins', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function kv(key, val) {
  const d = await db();
  return new Promise((res, rej) => {
    const tx = d.transaction('kv', val === undefined ? 'readonly' : 'readwrite');
    const st = tx.objectStore('kv');
    const r = val === undefined ? st.get(key) : st.put(val, key);
    tx.oncomplete = () => res(r.result);
    tx.onerror = () => rej(tx.error);
  });
}

const dkey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const pick = a => a[Math.floor(Math.random() * a.length)];

let running = false;
async function runReminders() {
  if (running) return;
  running = true;
  try {
    if (self.Notification && Notification.permission !== 'granted') return;
    const cfg = await kv('config');
    if (!cfg) return;
    const sent = (await kv('lastSent')) || {};
    const now = new Date();
    const t = dkey(now);
    const dow = now.getDay() || 7;
    const wins = await self.clients.matchAll({ type: 'window' });
    const visible = wins.some(c => c.visibilityState === 'visible');
    const due = [];

    for (const [id, r] of Object.entries(cfg.reminders)) {
      if (!r.on || sent[id] === t) continue;
      if (id === 'weighin' && dow !== r.day) continue;
      const [h, m] = r.time.split(':').map(Number);
      const at = new Date(now); at.setHours(h, m, 0, 0);
      const late = now - at;
      if (late < 0) continue;
      sent[id] = t;
      if (late > 3 * 3600e3) continue;                // too stale to be useful
      if (visible && late > 10 * 60e3) continue;      // user is already in the app
      if (id === 'checkin' && cfg.status?.date === t && cfg.status.done >= cfg.status.total) continue;
      due.push({ id, late });
    }
    await kv('lastSent', sent);
    if (!due.length) return;

    // Send one nudge, never a pile: the weigh-in wins on its day, otherwise the most recent.
    const { id } = due.sort((a, b) => (b.id === 'weighin') - (a.id === 'weighin') || a.late - b.late)[0];
    const msg = pick(cfg.messages[id] || [{ title: 'Tiny Wins', body: 'Time for a tiny win.' }]);
    let body = msg.body;
    if (id === 'checkin' && cfg.status?.date === t && cfg.status.total) {
      body = `You’re at ${cfg.status.done}/${cfg.status.total} tiny wins today. ${msg.body}`;
    }
    await self.registration.showNotification(msg.title, {
      body, tag: id, renotify: true,
      icon: 'icons/icon-192.png', badge: 'icons/badge-96.png',
      vibrate: [80, 40, 80],
      data: { url: msg.url || (id === 'weighin' ? './#/progress' : './#/today') },
    });
  } catch (err) {
    console.warn('reminders', err);
  } finally {
    running = false;
  }
}

self.addEventListener('periodicsync', e => {
  if (e.tag === 'tinywins-reminders') e.waitUntil(runReminders());
});

self.addEventListener('message', e => {
  if (e.data?.type === 'tick') e.waitUntil(runReminders());
});

// Ready for a real push server later (payload: {title, body, url}).
self.addEventListener('push', e => {
  const d = e.data?.json?.() || {};
  e.waitUntil(self.registration.showNotification(d.title || 'Tiny Wins', {
    body: d.body || 'Time for a tiny win 💪', icon: 'icons/icon-192.png', badge: 'icons/badge-96.png',
    data: { url: d.url || './#/today' },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './#/today', self.registration.scope).href;
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of wins) {
      if (c.url.startsWith(self.registration.scope)) {
        await c.focus();
        return c.navigate(url).catch(() => {});
      }
    }
    return self.clients.openWindow(url);
  })());
});
