// Cross-device sync: account auth + push/pull of the whole state blob.
// Conflicts are merged (union of logged days, weigh-ins, cravings, etc.) so
// using two devices never silently wipes progress.
import { getState, replaceState } from './store.js';

const TOKEN_KEY = 'tinywins.token';
const EMAIL_KEY = 'tinywins.email';
const SYNC_KEY = 'tinywins.lastSync';
const BASE_KEY = 'tinywins.apiBase'; // dev override; empty = same origin

const ls = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
  del: k => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

const API = () => (ls.get(BASE_KEY) || '') + '/api';

const S = {
  token: ls.get(TOKEN_KEY),
  email: ls.get(EMAIL_KEY),
  lastSync: +ls.get(SYNC_KEY) || 0,
  status: 'idle', // idle | syncing | ok | error | offline
  error: null,
};
let applying = false;      // true while we write a pulled state (suppresses auto-push)
let pushTimer = null;
let lastPushedAt = 0;

export const auth = () => ({
  signedIn: !!S.token, email: S.email, lastSync: S.lastSync, status: S.status, error: S.error,
});
const emit = () => { try { window.dispatchEvent(new Event('tinywins-sync')); } catch { /* ignore */ } };
const setStatus = (status, error = null) => { S.status = status; S.error = error; emit(); };

async function api(path, { method = 'GET', body, withAuth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (withAuth && S.token) headers.Authorization = `Bearer ${S.token}`;
  const res = await fetch(API() + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (res.status === 401 && withAuth) signOutLocal();
  return { res, data };
}

/* ---------- merge two full states ---------- */
const rank = v => (v === 'full' ? 2 : v === 'mini' ? 1 : 0);

function mergeDays(a = {}, b = {}) {
  const out = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const da = a[k] || {}, db = b[k] || {};
    const habits = { ...da.habits };
    for (const [h, v] of Object.entries(db.habits || {})) {
      if (rank(v) > rank(habits[h])) habits[h] = v;
      else habits[h] ||= v;
    }
    out[k] = { ...da, ...db, habits, meals: { ...da.meals, ...db.meals }, lucky: { ...da.lucky, ...db.lucky } };
    if (da.survival || db.survival) out[k].survival = true;
    const desk = Math.max(da.deskBreaks || 0, db.deskBreaks || 0);
    if (desk) out[k].deskBreaks = desk;
  }
  return out;
}
const unionBy = (a = [], b = [], key) => {
  const m = new Map();
  for (const x of [...a, ...b]) m.set(key(x), x);
  return [...m.values()];
};
const mergeEarliest = (a = {}, b = {}) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = out[k] ? (out[k] < v ? out[k] : v) : v;
  return out;
};

export function mergeStates(a, b) {
  const newer = (a.updatedAt || 0) >= (b.updatedAt || 0) ? a : b;
  const m = structuredClone(newer); // scalars/profile/stage/reminders/settings from newest
  m.days = mergeDays(a.days, b.days);
  m.weights = unionBy(a.weights, b.weights, w => w.date).sort((x, y) => x.date.localeCompare(y.date));
  m.cravings = unionBy(a.cravings, b.cravings, c => c.ts).sort((x, y) => x.ts - y.ts);
  m.workouts = unionBy(a.workouts, b.workouts, w => w.ts).sort((x, y) => x.ts - y.ts);
  m.badges = mergeEarliest(a.badges, b.badges);
  m.quests = mergeEarliest(a.quests, b.quests);
  m.ifthen = unionBy(a.ifthen, b.ifthen, p => p.text);
  m.onboarded = a.onboarded || b.onboarded;
  m.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
  return m;
}

/* ---------- apply a remote/merged state without triggering a push ---------- */
function applyState(next) {
  applying = true;
  try { replaceState(next); } finally { applying = false; }
  lastPushedAt = getState().updatedAt;
}

/* ---------- auth ---------- */
async function afterAuth(data) {
  S.token = data.token; S.email = data.email;
  ls.set(TOKEN_KEY, S.token); ls.set(EMAIL_KEY, S.email);
  emit();
  await fullSync();
}

export async function register(email, password, code) {
  const { res, data } = await api('/register', { method: 'POST', withAuth: false, body: { email, password, code } });
  if (!res.ok) return { ok: false, error: data?.error || 'Could not create the account.' };
  await afterAuth(data);
  return { ok: true };
}
export async function login(email, password) {
  const { res, data } = await api('/login', { method: 'POST', withAuth: false, body: { email, password } });
  if (!res.ok) return { ok: false, error: data?.error || 'Could not sign in.' };
  await afterAuth(data);
  return { ok: true };
}
function signOutLocal() {
  S.token = null; S.email = null;
  ls.del(TOKEN_KEY); ls.del(EMAIL_KEY);
  setStatus('idle');
}
export async function signOut() {
  try { await api('/logout', { method: 'POST' }); } catch { /* best effort */ }
  signOutLocal();
}

const setLastSync = () => { S.lastSync = Date.now(); ls.set(SYNC_KEY, String(S.lastSync)); };

/* ---------- sync ---------- */
export async function fullSync() {
  if (!S.token) return;
  setStatus('syncing');
  try {
    const { res, data } = await api('/state');
    if (!res.ok) return setStatus('error', data?.error || 'Sync failed.');
    const local = getState();
    if (data.data) {
      const remote = { ...data.data, updatedAt: data.updatedAt };
      applyState(mergeStates(local, remote));
    }
    await push(true);
    setLastSync();
    setStatus('ok');
  } catch {
    setStatus('offline', 'No connection. Will retry.');
  }
}

export async function push(force = false) {
  if (!S.token) return;
  const s = getState();
  if (!force && s.updatedAt === lastPushedAt) return;
  setStatus('syncing');
  try {
    const { res, data } = await api('/state', { method: 'PUT', body: { updatedAt: s.updatedAt, data: s } });
    if (res.status === 409 && data?.data) {
      // Server is newer — merge its copy in, then push the merged result once.
      applyState(mergeStates(s, { ...data.data, updatedAt: data.updatedAt }));
      const s2 = getState();
      const retry = await api('/state', { method: 'PUT', body: { updatedAt: s2.updatedAt, data: s2 } });
      if (retry.res.ok) { lastPushedAt = s2.updatedAt; setLastSync(); setStatus('ok'); }
      else setStatus('error', 'Sync conflict. Try again.');
      return;
    }
    if (!res.ok) return setStatus('error', data?.error || 'Sync failed.');
    lastPushedAt = s.updatedAt;
    setLastSync();
    setStatus('ok');
  } catch {
    setStatus('offline', 'No connection. Changes are saved locally.');
  }
}

function schedulePush() {
  if (!S.token || applying) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => push(false), 2500);
}

/* ---------- wiring ---------- */
export function initSync(onCommit) {
  onCommit(() => schedulePush());
  addEventListener('online', () => { if (S.token) fullSync(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.token) push(false); });
  if (S.token) { setStatus('syncing'); fullSync(); }
}
