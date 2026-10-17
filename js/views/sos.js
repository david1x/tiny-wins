// Craving SOS: name the craving → ride the 10-minute wave → log the outcome kindly.
import { commit, getState } from '../store.js';
import { on } from '../actions.js';
import { CRAVINGS, SMART_SNACKS, IF_THEN_PRESETS } from '../data.js';
import { openSheet, closeSheet, confetti, toast, ring, beep } from '../ui.js';
import { esc, vibrate } from '../util.js';

const WAVE = 10 * 60;
let timer = null;

const stop = () => { clearInterval(timer); timer = null; };

export function openSOS() {
  stop();
  const body = openSheet({
    full: true, cls: 'sos', onClose: stop,
    html: `<div class="sos-wrap">
      <p class="eyebrow">🆘 Craving SOS</p>
      <h2>Craving hit? Good, you opened this instead of the fridge.</h2>
      <p class="muted">That alone is a win. What’s it for?</p>
      <div class="crave-grid">${Object.entries(CRAVINGS).map(([k, c]) =>
        `<button class="crave" data-type="${k}"><span>${c.icon}</span>${c.label}</button>`).join('')}</div>
    </div>`,
  });
  body.addEventListener('click', e => {
    const t = e.target.closest('[data-type]')?.dataset.type;
    if (!t) return;
    vibrate(20);
    if (t === 'hungry') hungry(body); else wave(body, t);
  });
}

function hungry(body) {
  body.innerHTML = `<div class="sos-wrap">
    <p class="eyebrow">🍽️ Real hunger is fine</p>
    <h2>Then eat, just eat something that fights back.</h2>
    <p class="muted">Pick a protein snack. It keeps you full and stops the junk spiral.</p>
    <div class="snack-list">${SMART_SNACKS.map(x => `<div class="snack">${x}</div>`).join('')}</div>
    <button class="btn block lg" data-out="smart">I ate a smart snack 💪</button>
    <button class="btn ghost block" data-close>Close</button>
  </div>`;
  body.onclick = e => { if (e.target.closest('[data-out]')) logOutcome(body, 'hungry', 'smart'); };
}

function wave(body, type) {
  const c = CRAVINGS[type];
  const s = getState();
  const plans = s.ifthen.filter(p => p.type === type || !p.type).slice(-2);
  let left = WAVE;
  body.innerHTML = `<div class="sos-wrap">
    <p class="eyebrow">${c.icon} ${c.label} craving · urge surfing</p>
    <h2>Ride the wave.</h2>
    <p class="muted">Cravings rise, peak and fade, usually within 10–15 minutes. You don’t have to fight it. Just watch it pass.</p>
    <div class="breath-box">
      <div class="breath"><span id="breath-txt">Breathe in</span></div>
      <div class="wave-time" id="wave-time"></div>
    </div>
    <div class="card stack">
      <b>While you wait:</b>
      ${c.tips.map(t => `<label class="todo"><input type="checkbox"><span>${esc(t)}</span></label>`).join('')}
    </div>
    ${s.profile.why ? `<div class="card why-card"><small>REMEMBER YOUR WHY</small><p>“${esc(s.profile.why)}”</p></div>` : ''}
    ${plans.length ? `<div class="card why-card plan"><small>YOUR IF-THEN PLAN</small>${plans.map(p => `<p>${esc(p.text)}</p>`).join('')}</div>` : ''}
    <p class="hint">${esc(c.swap)}</p>
    <button class="btn block lg" data-step="done">The wave passed 🌊</button>
    <button class="btn ghost block" data-step="done">I need to decide now</button>
  </div>`;
  const tEl = body.querySelector('#wave-time');
  const bEl = body.querySelector('#breath-txt');
  const draw = () => {
    tEl.innerHTML = ring(left / WAVE, { size: 120, stroke: 9, label: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`, sub: 'wave', color: 'var(--sky)' });
    // 4s in, 6s out
    bEl.textContent = (WAVE - left) % 10 < 4 ? 'Breathe in' : 'Breathe out';
  };
  draw();
  stop();
  timer = setInterval(() => {
    left--;
    if (left <= 0) {
      stop(); vibrate([100, 50, 100]); beep(880, 250);
      outcome(body, type);
      return;
    }
    draw();
  }, 1000);
  body.onclick = e => {
    if (e.target.closest('[data-step="done"]')) { stop(); outcome(body, type); }
  };
}

function outcome(body, type) {
  body.innerHTML = `<div class="sos-wrap">
    <p class="eyebrow">How did it go?</p>
    <h2>Be honest. Every answer earns XP.</h2>
    <div class="stack">
      <button class="pick big" data-out="beat">💪 <div><b>I beat it</b><small>Didn’t eat it. +15 XP</small></div></button>
      <button class="pick big" data-out="small">🤏 <div><b>Had a small portion</b><small>Moderation is a skill. +8 XP</small></div></button>
      <button class="pick big" data-out="ate">🍪 <div><b>I ate it</b><small>It happens. Honesty still earns +3 XP</small></div></button>
    </div>
  </div>`;
  body.onclick = e => {
    const o = e.target.closest('[data-out]')?.dataset.out;
    if (o) logOutcome(body, type, o);
  };
}

function logOutcome(body, type, out) {
  commit(s => { s.cravings.push({ ts: Date.now(), type, outcome: out }); });
  const s = getState();
  const beat = s.cravings.filter(c => c.outcome === 'beat').length;
  vibrate(40);
  if (out === 'beat' || out === 'smart') {
    confetti(140);
    body.innerHTML = `<div class="sos-wrap center">
      <div class="big-emoji pop">🏄</div>
      <h2>${out === 'beat' ? `Craving #${beat} beaten!` : 'Smart move!'}</h2>
      <p class="muted">${out === 'beat'
        ? 'Every craving you ride out makes the next one weaker. You’re literally rewiring the habit loop.'
        : 'Feeding real hunger with protein is exactly right. No guilt, just good choices.'}</p>
      <button class="btn block lg" data-close>Back to my day</button>
    </div>`;
    body.onclick = null;
    return;
  }
  body.innerHTML = `<div class="sos-wrap">
    <div class="big-emoji">${out === 'small' ? '👍' : '🤗'}</div>
    <h2>${out === 'small' ? 'That’s a win, not a fail.' : 'One snack doesn’t undo a week.'}</h2>
    <p class="muted">${out === 'small'
      ? 'You were in control. That’s exactly how a healthy relationship with food looks.'
      : 'Guilt makes people quit. You logged it honestly, and that’s the habit that matters. Next meal is a fresh start. Never miss twice.'}</p>
    <div class="card stack">
      <b>Make a plan for next time (takes 3 sec):</b>
      ${IF_THEN_PRESETS.map(p => `<button class="pick" data-plan="${esc(p)}">${esc(p)}</button>`).join('')}
    </div>
    <button class="btn ghost block" data-close>Skip</button>
  </div>`;
  body.onclick = e => {
    const p = e.target.closest('[data-plan]')?.dataset.plan;
    if (!p) return;
    commit(st => {
      st.ifthen = st.ifthen.filter(x => x.text !== p);
      st.ifthen.push({ text: p, type });
    });
    closeSheet();
    toast('<b>Plan saved.</b> It’ll show up next time a craving hits.', { ms: 3500 });
  };
}

on('sos', () => openSOS());
