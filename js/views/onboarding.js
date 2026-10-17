import { commit, defaultReminders } from '../store.js';
import { on } from '../actions.js';
import { computePlan } from '../logic.js';
import { LIFE_TAGS, IDENTITIES } from '../data.js';
import { REMINDER_INFO, enableNotifications, notifPermission } from '../notify.js';
import { confetti, toast } from '../ui.js';
import { esc, today, fmtNum, fmtKg, fmtDate, vibrate, joinList } from '../util.js';

const EXAMPLE = {
  name: 'Mike', sex: 'male', age: 34, heightCm: 180, weight: 104.5, lose: 15, months: 12, activity: 'desk',
  tags: ['desk', 'kids', 'pregnant', 'junk', 'night', 'sweet'],
  identities: [IDENTITIES[0], IDENTITIES[2]], ownIdentity: '',
  why: 'I want to be a fit dad for my kid and the new baby, and feel good in my body again.',
};

let step = 0;
let d = {
  name: '', sex: 'male', age: 34, heightCm: 180, weight: 100, lose: 10, months: 12, activity: 'desk',
  tags: [], identities: [], ownIdentity: '', why: '', reminders: defaultReminders(),
};
let host;

const STEPS = [welcome, about, goal, life, identity, reminders, contract];

export function renderOnboarding(el) {
  host = el;
  el.dataset.view = 'onboarding';
  el.innerHTML = `<div class="ob">
    <div class="ob-dots">${STEPS.map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>
    ${STEPS[step]()}
  </div>`;
  if (step === STEPS.length - 1) wireSign();
}

const rerender = () => { renderOnboarding(host); window.scrollTo({ top: 0 }); };
const nav = (back = true, nextLabel = 'Continue') => `<div class="ob-nav">
  ${back ? '<button class="btn ghost" data-action="ob-back">Back</button>' : '<span></span>'}
  <button class="btn" data-action="ob-next">${nextLabel}</button></div>`;

function welcome() {
  return `<div class="ob-hero">
      <img class="logo-big" src="icons/icon-192.png" alt="" width="96" height="96">
      <h1>Tiny Wins</h1>
      <p class="lead">Lose weight without becoming a different person.</p>
    </div>
    <div class="card stack">
      <div class="feat"><span>🐢</span><div><b>Tiny steps, one stage at a time</b><p>Start with 2 habits so small they feel silly. Unlock the next stage only when you’re ready.</p></div></div>
      <div class="feat"><span>🧠</span><div><b>Psychology, not willpower</b><p>Cravings SOS, smart kitchen tricks, streaks that forgive, and rewards your brain loves.</p></div></div>
      <div class="feat"><span>🚫</span><div><b>No calorie counting</b><p>One-tap meal ratings. The habits create the deficit for you.</p></div></div>
    </div>
    <button class="btn block lg" data-action="ob-next">Let’s start (2 min)</button>
    <button class="btn ghost block" data-action="ob-example">Try the example: 34y desk dad, 104.5 kg</button>`;
}

function about() {
  return `<h2>About you</h2><p class="muted">Used only to build your plan. Everything stays on this phone.</p>
    <div class="card stack">
      <label class="field"><span>First name</span><input id="f-name" value="${esc(d.name)}" placeholder="What should we call you?" autocomplete="given-name"></label>
      <div class="field"><span>Sex (for the calorie formula)</span>
        <div class="seg">${['male', 'female'].map(s => `<button class="${d.sex === s ? 'on' : ''}" data-action="ob-sex" data-v="${s}">${s === 'male' ? '♂ Male' : '♀ Female'}</button>`).join('')}</div></div>
      <div class="grid3">
        <label class="field"><span>Age</span><input id="f-age" type="number" inputmode="numeric" value="${d.age}"></label>
        <label class="field"><span>Height cm</span><input id="f-height" type="number" inputmode="numeric" value="${d.heightCm}"></label>
        <label class="field"><span>Weight kg</span><input id="f-weight" type="number" inputmode="decimal" step="0.1" value="${d.weight}"></label>
      </div>
      <div class="field"><span>Your day</span>
        <div class="seg">${[['desk', '💻 Desk job'], ['light', '🚶 On my feet'], ['active', '🏃 Active']].map(([v, l]) => `<button class="${d.activity === v ? 'on' : ''}" data-action="ob-act" data-v="${v}">${l}</button>`).join('')}</div></div>
    </div>${nav()}`;
}

function goal() {
  const p = { ...d, startWeight: d.weight, goalWeight: d.weight - d.lose, startDate: today() };
  const plan = computePlan(p);
  return `<h2>Your goal</h2><p class="muted">Slow and steady stays off. Fast comes back.</p>
    <div class="card stack">
      <label class="field"><span>Lose <b id="v-lose">${d.lose}</b> kg</span>
        <input id="f-lose" type="range" min="3" max="40" step="0.5" value="${d.lose}" data-change="ob-goal" data-input="ob-goal-live"></label>
      <label class="field"><span>In <b id="v-months">${d.months}</b> months</span>
        <input id="f-months" type="range" min="3" max="24" step="1" value="${d.months}" data-change="ob-goal" data-input="ob-goal-live"></label>
    </div>
    <div class="card plan-preview">
      <div class="pp-big">${fmtKg(d.weight)} → <b>${fmtKg(d.weight - d.lose)} kg</b></div>
      <div class="pp-grid">
        <div><b>${(plan.weekly * 1000).toFixed(0)} g</b><small>per week</small></div>
        <div><b>~${fmtNum(plan.kcal)}</b><small>kcal / day</small></div>
        <div><b>${fmtDate(plan.targetDate, { month: 'short', year: 'numeric' })}</b><small>goal date</small></div>
      </div>
      ${plan.aggressive
        ? '<p class="warn">⚠️ That’s fast (over 1% of your weight per week). Lazy-proof plans work better slower. Try more months.</p>'
        : `<p class="ok">✅ Very doable. That’s only about ${fmtNum(plan.deficit)} kcal a day less than you burn: roughly one snack and one soda.</p>`}
    </div>${nav()}`;
}

function life() {
  return `<h2>Your real life</h2><p class="muted">Pick everything that fits. We tune tips and the plan to it.</p>
    <div class="chips">${LIFE_TAGS.map(([id, l]) => `<button class="chip ${d.tags.includes(id) ? 'on' : ''}" data-action="ob-tag" data-v="${id}">${l}</button>`).join('')}</div>
    ${d.tags.includes('junk') ? '<div class="card note">🍪 Junk at home is the #1 diet killer. Stage 2 is built just for this, and it doesn’t ask your family to give anything up.</div>' : ''}
    ${d.tags.includes('pregnant') ? '<div class="card note">🤰 A baby is coming! You get a <b>Survival mode</b> for the hard weeks: one tiny win = a good day, and your streak is protected.</div>' : ''}
    ${nav()}`;
}

const allIdentities = () => [...d.identities, d.ownIdentity.trim()].filter(Boolean);

function identity() {
  return `<h2>Who are you becoming?</h2><p class="muted">Habits stick when they’re part of who you are, not just a goal. Pick all that fit.</p>
    <div class="stack" role="group" aria-label="Who are you becoming">${IDENTITIES.map(t => {
      const on = d.identities.includes(t);
      return `<button class="pick check ${on ? 'on' : ''}" data-action="ob-id" data-v="${esc(t)}" aria-pressed="${on}"><i aria-hidden="true">${on ? '✓' : ''}</i>${esc(t)}</button>`;
    }).join('')}</div>
    <label class="field"><span>Add your own (optional)</span><input id="f-identity" value="${esc(d.ownIdentity)}" placeholder="I’m becoming someone who…"></label>
    <label class="field"><span>Your big WHY (we’ll show it when cravings hit)</span>
      <textarea id="f-why" rows="3" placeholder="e.g. I want to keep up with my kids">${esc(d.why)}</textarea></label>
    ${nav()}`;
}

function reminders() {
  const perm = notifPermission();
  return `<h2>Smart reminders</h2><p class="muted">A few nudges at the moments that matter. You can change them anytime.</p>
    <div class="card stack">${Object.entries(d.reminders).map(([id, r]) => `
      <div class="rem-row">
        <span class="rem-ic">${REMINDER_INFO[id].icon}</span>
        <div class="grow"><b>${REMINDER_INFO[id].label}</b>${id === 'weighin' ? '<small>Mondays</small>' : ''}</div>
        <input type="time" value="${r.time}" data-change="ob-rem-time" data-id="${id}">
        <label class="switch"><input type="checkbox" ${r.on ? 'checked' : ''} data-change="ob-rem-on" data-id="${id}"><i></i></label>
      </div>`).join('')}
    </div>
    ${perm === 'granted'
      ? '<div class="card note ok">🔔 Notifications are on.</div>'
      : perm === 'unsupported'
        ? '<div class="card note">This browser doesn’t support notifications. Use Chrome on Android for reminders.</div>'
        : '<button class="btn block sky" data-action="ob-notif">🔔 Allow notifications</button>'}
    ${nav()}`;
}

function contract() {
  const name = d.name || 'I';
  return `<h2>Your contract</h2><p class="muted">People who commit in writing follow through more often. Make it official.</p>
    <div class="card contract">
      <p>I, <b>${esc(name)}</b>, commit to <b>tiny steps</b>, not perfection.</p>
      <p>I’m becoming: <i>${esc(joinList(allIdentities().map(t => (/^I\b/.test(t) ? t : t[0].toLowerCase() + t.slice(1)))) || 'a healthier version of me')}</i>.</p>
      <p>When I slip, I won’t quit. I’ll <b>never miss twice</b>.</p>
      <p class="muted small">${fmtDate(today(), { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </div>
    <button class="hold-btn" id="hold"><span class="hold-fill"></span><span class="hold-label">Press &amp; hold to sign ✍️</span></button>
    <button class="btn ghost block" data-action="ob-back">Back</button>`;
}

function wireSign() {
  const btn = host.querySelector('#hold');
  const fill = btn.querySelector('.hold-fill');
  let t0 = 0, raf = 0;
  const stop = () => { cancelAnimationFrame(raf); if (t0) { fill.style.width = '0%'; t0 = 0; } };
  const loop = () => {
    const p = Math.min(1, (performance.now() - t0) / 1400);
    fill.style.width = `${p * 100}%`;
    if (p >= 1) { t0 = 0; vibrate([60, 40, 120]); finish(); return; }
    raf = requestAnimationFrame(loop);
  };
  btn.addEventListener('pointerdown', e => { e.preventDefault(); t0 = performance.now(); vibrate(20); loop(); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, stop));
  btn.addEventListener('contextmenu', e => e.preventDefault());
}

function finish() {
  const t = today();
  confetti(160);
  commit(s => {
    s.profile = {
      name: d.name.trim() || 'Champ', sex: d.sex, age: +d.age, heightCm: +d.heightCm, activity: d.activity,
      startWeight: +d.weight, goalWeight: +(d.weight - d.lose).toFixed(1), months: +d.months,
      startDate: t, tags: d.tags, identities: allIdentities().length ? allIdentities() : ['A healthier version of me'], why: d.why,
    };
    s.stage = { index: 0, history: [{ index: 0, start: t }] };
    s.weights = [{ date: t, kg: +d.weight }];
    s.reminders = d.reminders;
    s.onboarded = true;
  });
  location.hash = '#/today';
  setTimeout(() => toast('<b>Contract signed ✍️</b> Stage 1 starts now. Just two tiny habits.', { ms: 4000 }), 500);
}

/* ---------- capture inputs before re-rendering ---------- */
function capture() {
  const v = id => host.querySelector(id)?.value;
  if (v('#f-name') !== undefined) d.name = v('#f-name');
  if (v('#f-age')) d.age = +v('#f-age');
  if (v('#f-height')) d.heightCm = +v('#f-height');
  if (v('#f-weight')) d.weight = +v('#f-weight');
  if (v('#f-identity') !== undefined) d.ownIdentity = v('#f-identity');
  if (v('#f-why') !== undefined) d.why = v('#f-why');
}

function validate() {
  if (step === 1) {
    if (!(d.age >= 16 && d.age <= 90)) return 'Please enter an age between 16 and 90.';
    if (!(d.heightCm >= 120 && d.heightCm <= 230)) return 'Height looks off. Use centimeters.';
    if (!(d.weight >= 40 && d.weight <= 300)) return 'Weight looks off. Use kilograms.';
  }
  if (step === 4 && !allIdentities().length) return 'Pick at least one, or write your own.';
  return null;
}

on('ob-next', () => {
  capture();
  const err = validate();
  if (err) return toast(err, { kind: 'warn' });
  step = Math.min(STEPS.length - 1, step + 1);
  rerender();
});
on('ob-back', () => { capture(); step = Math.max(0, step - 1); rerender(); });
on('ob-example', () => { d = { ...d, ...EXAMPLE, reminders: defaultReminders() }; step = 1; rerender(); });
on('ob-sex', el => { capture(); d.sex = el.dataset.v; rerender(); });
on('ob-act', el => { capture(); d.activity = el.dataset.v; rerender(); });
on('ob-tag', el => {
  const id = el.dataset.v;
  d.tags = d.tags.includes(id) ? d.tags.filter(x => x !== id) : [...d.tags, id];
  rerender();
});
on('ob-id', el => {
  capture();
  const t = el.dataset.v;
  d.identities = d.identities.includes(t) ? d.identities.filter(x => x !== t) : [...d.identities, t];
  rerender();
});
on('ob-goal', () => {
  d.lose = +host.querySelector('#f-lose').value;
  d.months = +host.querySelector('#f-months').value;
  rerender();
});
on('ob-goal-live', el => {
  const out = host.querySelector(el.id === 'f-lose' ? '#v-lose' : '#v-months');
  if (out) out.textContent = el.value;
});
on('ob-rem-time', el => { d.reminders[el.dataset.id].time = el.value; });
on('ob-rem-on', el => { d.reminders[el.dataset.id].on = el.checked; });
on('ob-notif', async () => {
  const p = await enableNotifications({ onboarded: false });
  if (p === 'denied') toast('Notifications blocked. You can allow them later in Chrome site settings.', { kind: 'warn', ms: 4000 });
  rerender();
});
