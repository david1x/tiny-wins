// Reminders. The service worker owns the schedule (so it can fire while the app is closed via
// Periodic Background Sync); the page mirrors config + message text into IndexedDB for it.
import { habitsForStage, dayStatus } from './logic.js';
import { today, rand } from './util.js';

const DB = 'tinywins', STORE = 'kv';

function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function kvSet(key, val) {
  const d = await db();
  return new Promise((res, rej) => {
    const tx = d.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(val, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export function notifSupported() {
  try {
    return 'Notification' in window && 'serviceWorker' in navigator && !!navigator.serviceWorker;
  } catch {
    return false;
  }
}
export const notifPermission = () => (notifSupported() ? Notification.permission : 'unsupported');

export const REMINDER_INFO = {
  morning: { label: 'Morning win', icon: '🌅' },
  lunch: { label: 'Lunch nudge', icon: '🥪' },
  evening: { label: 'Danger-zone shield', icon: '🌙' },
  checkin: { label: 'End-of-day check-in', icon: '✅' },
  weighin: { label: 'Weekly weigh-in', icon: '⚖️' },
};

function messages(state) {
  const name = state.profile?.name || 'champ';
  const active = new Set(habitsForStage(state.stage.index).map(h => h.id));
  const has = id => active.has(id);
  return {
    morning: [
      has('protein')
        ? { title: '🍳 Morning win', body: 'Protein breakfast + a glass of water first. Two tiny wins before 9am.' }
        : { title: '💧 Morning win', body: `Morning ${name}! Start with a glass of water. Tiny win #1.` },
      { title: '🌅 New day, clean slate', body: 'Just today’s tiny wins. Nothing else matters.' },
    ],
    lunch: [
      has('walk')
        ? { title: '🚶 Walk it off', body: '10 minutes after lunch. Bad day? Even 2 minutes counts.' }
        : { title: '🥪 Lunch time', body: 'Water before you eat 💧 then one tap to rate the meal.' },
      has('drinks')
        ? { title: '🥤 Drink check', body: 'Water, sparkling or zero with lunch. Liquid calories don’t fill you up.' }
        : { title: '💧 Water first', body: 'A full glass before lunch. Your stomach will thank you.' },
    ],
    evening: [
      { title: '🌙 Danger-zone hours', body: has('snackbox') ? 'The family snacks are in the box. Not your business tonight 😉' : 'Evening snacks hit hardest now. Craving? Open SOS and ride the 10-min wave.' },
      { title: '🦷 Kitchen closing soon', body: 'Brush your teeth after dinner = done eating. Easy win.' },
      { title: '🌊 Craving incoming?', body: 'Cravings peak and pass in about 10–15 minutes. Tap here for the SOS timer.', url: './#/sos' },
    ],
    checkin: [
      { title: '✅ Daily check-in', body: 'One more tap keeps your streak alive 🔥 The mini version counts.' },
      { title: '🔥 Streak check', body: `Hey ${name}, a few seconds to tick off today’s tiny wins?` },
    ],
    weighin: [
      { title: '⚖️ Weigh-in morning', body: 'After the bathroom, before breakfast. We watch the trend, not the day.' },
    ],
  };
}

// Push config + today's progress to IndexedDB so the service worker can decide what to send.
export async function syncReminders(state) {
  if (!state.onboarded || !('indexedDB' in window)) return;
  const t = today();
  const st = dayStatus(state, t);
  try {
    await kvSet('config', {
      reminders: state.reminders,
      messages: messages(state),
      status: { date: t, done: st.done, total: st.total },
    });
  } catch { /* IndexedDB unavailable */ }
}

export async function enableNotifications(state) {
  if (!notifSupported()) return 'unsupported';
  let p;
  try { p = await Notification.requestPermission(); } catch { return 'unsupported'; }
  if (p === 'granted') {
    await registerPeriodic();
    await syncReminders(state);
    const reg = await navigator.serviceWorker.ready;
    reg.showNotification('🎉 Reminders are on!', {
      body: 'We’ll nudge you at the right moments, never more than a few times a day.',
      icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', tag: 'welcome',
    });
  }
  return p;
}

export async function registerPeriodic() {
  if (!notifSupported()) return 'unsupported';
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!('periodicSync' in reg)) return 'unsupported';
    const perm = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (perm.state !== 'granted') return perm.state;
    await reg.periodicSync.register('tinywins-reminders', { minInterval: 60 * 60 * 1000 });
    return 'granted';
  } catch {
    return 'unsupported';
  }
}

export async function periodicStatus() {
  if (!notifSupported()) return 'unsupported';
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!('periodicSync' in reg)) return 'unsupported';
    const tags = await reg.periodicSync.getTags();
    if (tags.includes('tinywins-reminders')) return 'active';
    const perm = await navigator.permissions.query({ name: 'periodic-background-sync' });
    return perm.state === 'granted' ? 'available' : 'needs-install';
  } catch {
    return 'unsupported';
  }
}

export async function testNotification(state) {
  if (!notifSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const m = rand(messages(state).evening);
  reg.showNotification(m.title, { body: m.body, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', tag: 'test', data: { url: m.url || './#/today' } });
}

// While the app is open, wake the SW every 30s so reminders fire on time.
export function startTicker() {
  const tick = () => {
    try { navigator.serviceWorker?.controller?.postMessage({ type: 'tick' }); } catch { /* no SW */ }
  };
  setInterval(tick, 30000);
  document.addEventListener('visibilitychange', tick);
  setTimeout(tick, 3000);
}

