// Reusable UI: toasts, bottom sheets, confetti, progress ring, workout timer, charts.
import { esc, vibrate, fmtDate, daysBetween, addDays, today, weekStart, fmtKg } from './util.js';
import { trendLine } from './logic.js';

/* ---------- Toasts ---------- */
export function toast(html, { ms = 2600, kind = '' } = {}) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.innerHTML = html;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => {
    el.classList.remove('in');
    setTimeout(() => el.remove(), 350);
  }, ms);
}

/* ---------- Bottom sheet (Android back button closes it) ---------- */
let current = null;

export function openSheet({ html, full = false, onMount, onClose, cls = '' }) {
  const replacing = !!current;
  if (current) closeNow();
  const root = document.getElementById('sheet-root');
  const wrap = document.createElement('div');
  wrap.className = `sheet-wrap ${full ? 'full' : ''} ${cls}`;
  wrap.innerHTML = `<div class="sheet-backdrop" data-close></div>
    <section class="sheet" role="dialog" aria-modal="true">
      <div class="sheet-grab"></div>
      <button class="sheet-x" data-close aria-label="Close">✕</button>
      <div class="sheet-body">${html}</div>
    </section>`;
  root.appendChild(wrap);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => wrap.classList.add('in'));
  wrap.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeSheet(); });
  current = { wrap, onClose };
  if (!replacing || !history.state?.sheet) history.pushState({ sheet: 1 }, '');
  onMount?.(wrap.querySelector('.sheet-body'));
  return wrap.querySelector('.sheet-body');
}

export function closeSheet() {
  if (!current) return;
  if (history.state?.sheet) history.back();
  else closeNow();
}

export function closeNow() {
  const c = current;
  if (!c) return;
  current = null;
  c.onClose?.();
  c.wrap.classList.remove('in');
  document.body.classList.remove('no-scroll');
  setTimeout(() => c.wrap.remove(), 300);
}

export const sheetOpen = () => !!current;

// In-app replacement for confirm(), which embedded viewers block.
export function confirmSheet(message, { ok = 'Yes', danger = false } = {}) {
  return new Promise(resolve => {
    let answered = false;
    const body = openSheet({
      html: `<div class="confirm stack">
        <h2>${esc(message)}</h2>
        <div class="row gap"><button class="btn ghost grow" data-close>Cancel</button>
        <button class="btn grow ${danger ? 'danger' : ''}" data-ok>${esc(ok)}</button></div>
      </div>`,
      onClose: () => { if (!answered) resolve(false); },
    });
    body.querySelector('[data-ok]').addEventListener('click', () => {
      answered = true;
      resolve(true);
      closeSheet();
    });
  });
}

window.addEventListener('popstate', () => { if (current) closeNow(); });

/* ---------- Confetti ---------- */
const COLORS = ['#14b88a', '#ff6b57', '#ffb020', '#7c5cff', '#38bdf8', '#f472b6'];
let parts = [], raf = null;

export function confetti(n = 90) {
  const cv = document.getElementById('confetti');
  const ctx = cv.getContext('2d');
  const dpr = devicePixelRatio || 1;
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  ctx.scale(dpr, dpr);
  for (let i = 0; i < n; i++) {
    parts.push({
      x: innerWidth / 2 + (Math.random() - 0.5) * 80, y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 13 - 4,
      r: Math.random() * 6 + 4, c: COLORS[i % COLORS.length], a: Math.random() * 6, life: 1,
    });
  }
  if (raf) return;
  const tick = () => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 20);
    for (const p of parts) {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += 0.15; p.life -= 0.006;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      ctx.restore();
    }
    if (parts.length) raf = requestAnimationFrame(tick);
    else { raf = null; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); }
  };
  raf = requestAnimationFrame(tick);
}

/* ---------- Progress ring ---------- */
export function ring(pct, { size = 96, stroke = 10, label = '', sub = '', color = 'var(--primary)' } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.min(1, Math.max(0, pct)));
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="var(--track)" stroke-width="${stroke}" fill="none"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}" stroke-width="${stroke}" fill="none"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"
        transform="rotate(-90 ${size / 2} ${size / 2})" style="transition:stroke-dashoffset .6s ease"/>
    </svg>
    <div class="ring-label"><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</div>
  </div>`;
}

/* ---------- Sound ---------- */
let audio;
export function beep(freq = 880, ms = 140) {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = freq; o.type = 'sine';
    g.gain.setValueAtTime(0.18, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + ms / 1000);
    o.connect(g).connect(audio.destination);
    o.start(); o.stop(audio.currentTime + ms / 1000);
  } catch { /* audio unavailable */ }
}

/* ---------- Guided workout timer ---------- */
export function openWorkout(w, onDone) {
  let i = 0, left = w.steps[0].s, paused = false, timer = null, lock = null, finished = false;
  const total = w.steps.reduce((a, s) => a + s.s, 0);

  const body = openSheet({
    full: true, cls: 'workout',
    html: `<div class="wo">
      <p class="eyebrow">${w.icon} ${esc(w.name)}</p>
      <div class="wo-ring"></div>
      <h2 class="wo-name"></h2>
      <p class="wo-next muted"></p>
      <div class="wo-bar"><span></span></div>
      <div class="row gap center">
        <button class="btn ghost" data-wo="pause">Pause</button>
        <button class="btn ghost" data-wo="skip">Skip ›</button>
      </div>
    </div>`,
    onClose: () => { clearInterval(timer); lock?.release?.().catch(() => {}); },
  });

  navigator.wakeLock?.request('screen').then(l => { lock = l; }).catch(() => {});

  const draw = () => {
    const s = w.steps[i];
    const done = w.steps.slice(0, i).reduce((a, x) => a + x.s, 0) + (s.s - left);
    body.querySelector('.wo-ring').innerHTML = ring(left / s.s, {
      size: 220, stroke: 16, label: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`,
      sub: s.e, color: s.rest ? 'var(--sky)' : 'var(--primary)',
    });
    body.querySelector('.wo-name').textContent = s.n;
    const nx = w.steps[i + 1];
    body.querySelector('.wo-next').textContent = nx ? `Next: ${nx.n}` : 'Last one, finish strong!';
    body.querySelector('.wo-bar span').style.width = `${(done / total) * 100}%`;
  };

  const next = () => {
    i++;
    if (i >= w.steps.length) return finish();
    left = w.steps[i].s;
    vibrate(180); beep(w.steps[i].rest ? 520 : 880);
    draw();
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    clearInterval(timer);
    vibrate([100, 60, 100, 60, 200]); beep(1046, 300);
    body.innerHTML = `<div class="wo done">
      <div class="big-emoji pop">🎉</div>
      <h2>Done! That counts.</h2>
      <p class="muted">You just proved you’re someone who moves, even on a lazy day.</p>
      <button class="btn block" data-close>Collect +15 XP</button>
    </div>`;
    confetti();
    onDone?.();
  };

  body.addEventListener('click', e => {
    const a = e.target.closest('[data-wo]')?.dataset.wo;
    if (a === 'pause') {
      paused = !paused;
      e.target.textContent = paused ? 'Resume' : 'Pause';
    } else if (a === 'skip') next();
  });

  draw();
  timer = setInterval(() => {
    if (paused) return;
    left--;
    if (left <= 3 && left > 0) beep(660, 80);
    if (left <= 0) next(); else draw();
  }, 1000);
}

/* ---------- Weight chart (inline SVG) ---------- */
export function weightChart(weights, profile, plan) {
  if (!weights.length) return '<p class="muted">Log your first weigh-in to see your chart.</p>';
  const W = 340, H = 190, pl = 34, pr = 10, pt = 12, pb = 24;
  const start = profile.startDate;
  const last = weights.at(-1).date;
  const end = addDays(start, Math.max(28, daysBetween(start, last) + 7));
  const span = daysBetween(start, end);
  const trend = trendLine(weights);
  const paceAt = k => profile.startWeight - plan.weekly * (daysBetween(start, k) / 7);
  const vals = [...weights.map(w => w.kg), paceAt(end), profile.startWeight];
  const lo = Math.floor(Math.min(...vals) - 1), hi = Math.ceil(Math.max(...vals) + 1);
  const x = k => pl + (daysBetween(start, k) / span) * (W - pl - pr);
  const y = v => pt + ((hi - v) / (hi - lo)) * (H - pt - pb);
  const step = Math.max(1, Math.round((hi - lo) / 4));
  let grid = '';
  for (let v = lo; v <= hi; v += step) {
    grid += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" class="grid"/>
      <text x="${pl - 6}" y="${y(v) + 4}" class="axis" text-anchor="end">${v}</text>`;
  }
  const trendPath = trend.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.kg).toFixed(1)}`).join('');
  const dots = weights.map(w => `<circle cx="${x(w.date)}" cy="${y(w.kg)}" r="3.5" class="dot"><title>${fmtDate(w.date)}: ${fmtKg(w.kg)} kg</title></circle>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Weight chart">
    ${grid}
    <line x1="${x(start)}" y1="${y(profile.startWeight)}" x2="${x(end)}" y2="${y(paceAt(end))}" class="pace"/>
    <path d="${trendPath}" class="trend"/>
    ${dots}
    <text x="${pl}" y="${H - 6}" class="axis">${fmtDate(start)}</text>
    <text x="${W - pr}" y="${H - 6}" class="axis" text-anchor="end">${fmtDate(end)}</text>
  </svg>
  <div class="legend"><span><i class="lg-dot"></i>Weigh-ins</span><span><i class="lg-trend"></i>Trend</span><span><i class="lg-pace"></i>Plan pace</span></div>`;
}

/* ---------- Habit heatmap: last 12 weeks ---------- */
export function heatmap(statusFor, startKey) {
  const t = today();
  const first = addDays(weekStart(t), -7 * 11);
  let cols = '';
  for (let w = 0; w < 12; w++) {
    let cells = '';
    for (let d = 0; d < 7; d++) {
      const k = addDays(first, w * 7 + d);
      const cls = k > t ? 'future' : k < startKey ? 'before' : statusFor(k);
      cells += `<i class="hm ${cls}" title="${fmtDate(k)}"></i>`;
    }
    cols += `<div class="hm-col">${cells}</div>`;
  }
  return `<div class="heat">${cols}</div>
    <div class="legend"><span><i class="hm good"></i>Good day</span><span><i class="hm part"></i>Some</span><span><i class="hm frozen"></i>Freeze</span><span><i class="hm miss"></i>Missed</span></div>`;
}
