export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

export function dkey(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
export const today = () => dkey();
export function parseKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(k, n) {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dkey(d);
}
export const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);
export function weekStart(k) {
  const d = parseKey(k);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dkey(d);
}
export const fmtDate = (k, opts = { month: 'short', day: 'numeric' }) =>
  parseKey(k).toLocaleDateString('en-GB', opts);

export function hashStr(s) {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}
export const pickDaily = (arr, salt = '') => arr[hashStr(today() + salt) % arr.length];
export const rand = arr => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const fmtKg = n => (Math.round(n * 10) / 10).toFixed(1);
export const fmtNum = n => Math.round(n).toLocaleString('en-US');

export function vibrate(p) {
  try { navigator.vibrate?.(p); } catch { /* unsupported */ }
}

// ['a', 'b', 'c'] → "a, b and c"
export const joinList = arr => arr.length < 2 ? (arr[0] || '') : `${arr.slice(0, -1).join(', ')} and ${arr.at(-1)}`;

export const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
