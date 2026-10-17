import { commit, getState } from '../store.js';
import { on } from '../actions.js';
import { BADGES, CRAVINGS } from '../data.js';
import {
  computePlan, computeStreak, sortedWeights, latestWeight, trendLine, projection, dayStatus, dangerHour, bmiLabel,
} from '../logic.js';
import { weightChart, heatmap, openSheet, closeSheet, toast, confetti, confirmSheet } from '../ui.js';
import { esc, today, fmtKg, fmtDate, clamp } from '../util.js';

const MILESTONE_STEP = 2.5;

export function renderProgress(s) {
  const p = s.profile;
  const ws = sortedWeights(s);
  const cur = latestWeight(s);
  const plan = computePlan(p, cur);
  const st = computeStreak(s);
  const lost = p.startWeight - cur;
  const total = p.startWeight - p.goalWeight;
  const pct = total > 0 ? clamp(lost / total, 0, 1) : 0;
  const trend = trendLine(ws);
  const proj = projection(s);
  const nextMs = Math.max(MILESTONE_STEP, Math.ceil((Math.max(0, lost) + 0.001) / MILESTONE_STEP) * MILESTONE_STEP);
  const msPrev = nextMs - MILESTONE_STEP;
  const msPct = clamp((lost - msPrev) / MILESTONE_STEP, 0, 1);
  const beat = s.cravings.filter(c => c.outcome === 'beat').length;
  const winRate = s.cravings.length ? Math.round((s.cravings.filter(c => c.outcome !== 'ate').length / s.cravings.length) * 100) : null;
  const dh = dangerHour(s);
  const byType = Object.entries(CRAVINGS).map(([k, c]) => [c, s.cravings.filter(x => x.type === k).length]).filter(([, n]) => n);

  const statusFor = k => {
    if (st.frozen.has(k)) return 'frozen';
    const ds = dayStatus(s, k);
    if (ds.good) return 'good';
    if (ds.done > 0) return 'part';
    return k === today() ? 'future' : 'miss';
  };

  return `
  <h1 class="page-title">Progress</h1>

  <section class="card goal-card">
    <div class="row between">
      <div><p class="eyebrow">Lost so far</p><div class="huge">${lost >= 0 ? '−' : '+'}${fmtKg(Math.abs(lost))}<small> kg</small></div></div>
      <button class="btn" data-action="weigh">⚖️ Log weight</button>
    </div>
    <div class="bar big"><span style="width:${pct * 100}%"></span></div>
    <div class="row between small muted"><span>${fmtKg(p.startWeight)} kg</span><span>${Math.round(pct * 100)}% of goal</span><span>🎯 ${fmtKg(p.goalWeight)} kg</span></div>
  </section>

  <section class="card milestone">
    <p class="eyebrow">Next milestone</p>
    <div class="row between"><h3>−${fmtKg(nextMs)} kg</h3><b>${fmtKg(Math.max(0, nextMs - lost))} kg to go</b></div>
    <div class="bar"><span style="width:${msPct * 100}%"></span></div>
    <small class="muted">Small milestones every ${MILESTONE_STEP} kg. The next win is always close.</small>
  </section>

  <section class="card">
    <div class="row between"><h3>Weight trend</h3><small class="muted">${ws.length} weigh-in${ws.length === 1 ? '' : 's'}</small></div>
    ${weightChart(ws, p, plan)}
    <p class="hint">The trend line smooths out water & salt swings. ${trend.length > 1 ? `Trend now: <b>${fmtKg(trend.at(-1).kg)} kg</b>.` : ''}</p>
  </section>

  <div class="stats">
    <div class="stat"><b>${st.streak}🔥</b><small>streak · best ${st.best}</small></div>
    <div class="stat"><b>${beat}🌊</b><small>cravings beaten</small></div>
    <div class="stat"><b>${plan.bmi.toFixed(1)}</b><small>BMI · ${bmiLabel(plan.bmi)}</small></div>
    <div class="stat"><b>${proj?.date ? fmtDate(proj.date, { month: 'short', year: 'numeric' }) : '–'}</b><small>${proj?.date ? 'projected goal' : 'projection after 2+ weeks'}</small></div>
  </div>

  <section class="card">
    <h3>Consistency</h3>
    ${heatmap(statusFor, p.startDate)}
  </section>

  ${s.cravings.length ? `<section class="card">
    <h3>Craving insights</h3>
    <div class="pp-grid">
      <div><b>${s.cravings.length}</b><small>SOS used</small></div>
      <div><b>${winRate}%</b><small>handled well</small></div>
      <div><b>${dh || '–'}</b><small>danger hour</small></div>
    </div>
    <div class="chips small">${byType.map(([c, n]) => `<span class="chip on">${c.icon} ${c.label} · ${n}</span>`).join('')}</div>
    ${dh ? `<p class="hint">Your cravings peak around <b>${dh}</b>. Set your 🌙 danger-zone reminder just before it.</p>` : ''}
  </section>` : ''}

  <h4 class="sec">🏅 Badges <small>${Object.keys(s.badges).length}/${BADGES.length}</small></h4>
  <div class="badges">${BADGES.map(b => {
    const got = s.badges[b.id];
    return `<div class="badge ${got ? 'got' : ''}" title="${esc(b.hint)}">
      <span>${got ? b.icon : '🔒'}</span><b>${esc(b.name)}</b><small>${got ? fmtDate(got) : esc(b.hint)}</small></div>`;
  }).join('')}</div>

  ${ws.length > 1 ? `<h4 class="sec">📒 Weigh-in log</h4>
  <div class="card list">${[...ws].reverse().slice(0, 12).map((w, i, arr) => {
    const prev = arr[i + 1];
    const dlt = prev ? w.kg - prev.kg : 0;
    return `<div class="li"><span>${fmtDate(w.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
      <b>${fmtKg(w.kg)} kg</b><small class="${dlt > 0 ? 'up' : 'down'}">${prev ? (dlt > 0 ? '+' : '') + fmtKg(dlt) : 'start'}</small>
      <button class="x" data-action="del-weight" data-date="${w.date}" aria-label="Delete">✕</button></div>`;
  }).join('')}</div>` : ''}
  `;
}

export function openWeightSheet() {
  const s = getState();
  const last = latestWeight(s);
  const body = openSheet({
    html: `<div class="weigh">
      <h2>⚖️ Weigh-in</h2>
      <p class="muted">Morning, after the bathroom, before breakfast. Same conditions every time.</p>
      <div class="stepper">
        <button class="step-btn" data-w="-0.1">−</button>
        <input id="w-in" type="number" step="0.1" inputmode="decimal" value="${fmtKg(last)}">
        <button class="step-btn" data-w="0.1">+</button>
      </div>
      <label class="field"><span>Date</span><input id="w-date" type="date" value="${today()}" max="${today()}"></label>
      <button class="btn block lg" id="w-save">Save weigh-in</button>
    </div>`,
  });
  const inp = body.querySelector('#w-in');
  body.addEventListener('click', e => {
    const b = e.target.closest('[data-w]');
    if (b) inp.value = fmtKg(+inp.value + +b.dataset.w);
  });
  body.querySelector('#w-save').addEventListener('click', () => {
    const kg = +inp.value;
    const date = body.querySelector('#w-date').value || today();
    if (!(kg > 30 && kg < 350)) return toast('That weight looks off. Use kilograms.', { kind: 'warn' });
    const prev = sortedWeights(s).filter(w => w.date < date).at(-1);
    commit(st => {
      st.weights = st.weights.filter(w => w.date !== date);
      st.weights.push({ date, kg });
    });
    closeSheet();
    const d = prev ? kg - prev.kg : 0;
    if (!prev) toast('<b>Saved!</b> +20 XP for showing up.');
    else if (d < -0.05) { confetti(110); toast(`<b>−${fmtKg(-d)} kg!</b> The habits are working. +20 XP`, { kind: 'green', ms: 3500 }); }
    else if (d <= 0.3) toast('<b>Holding steady.</b> Normal week to week. The trend is what matters. +20 XP', { ms: 3500 });
    else toast('<b>Up a bit? Totally normal.</b> Salt, water & carbs swing the scale 1–2 kg. Watch the trend line, not the day. +20 XP', { ms: 5000 });
  });
}

on('del-weight', async el => {
  const s = getState();
  if (s.weights.length <= 1) return toast('Keep at least your starting weight.', { kind: 'warn' });
  if (!(await confirmSheet(`Delete the weigh-in from ${fmtDate(el.dataset.date)}?`, { ok: 'Delete', danger: true }))) return;
  commit(st => { st.weights = st.weights.filter(w => w.date !== el.dataset.date); });
});
