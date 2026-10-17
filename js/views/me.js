import { commit, getState, replaceState, resetState } from '../store.js';
import { on, appCtx } from '../actions.js';
import { SCIENCE, IDENTITIES, LIFE_TAGS } from '../data.js';
import { computeXP, levelFor, computePlan, latestWeight, identitiesOf } from '../logic.js';
import { openSheet, closeSheet, toast, confirmSheet } from '../ui.js';
import { auth, login, register, signOut, fullSync } from '../sync.js';
import { esc, today, isStandalone, fmtNum } from '../util.js';
import {
  REMINDER_INFO, notifPermission, enableNotifications, testNotification, periodicStatus, registerPeriodic,
} from '../notify.js';

let bgStatus = null;
const refreshBg = () => periodicStatus().then(v => {
  if (v !== bgStatus) {
    bgStatus = v;
    if (location.hash.includes('me')) commit(() => {});
  }
});

const BG_TEXT = {
  active: '✅ Background reminders active: they fire even when the app is closed.',
  available: 'Background reminders available. Tap “Enable” above.',
  'needs-install': '📲 Install the app to get reminders while it’s closed. Until then they fire while the app is open.',
  unsupported: 'This browser only shows reminders while the app is open. Use Chrome on Android & install the app.',
};
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function renderMe(s) {
  const p = s.profile;
  const lv = levelFor(computeXP(s));
  const plan = computePlan(p, latestWeight(s));
  const perm = notifPermission();
  if (bgStatus === null) refreshBg();

  return `
  <section class="card profile">
    <div class="avatar">${esc(p.name[0] || '?').toUpperCase()}</div>
    <div class="grow">
      <h2>${esc(p.name)}</h2>
      <p class="muted small">${p.age}y · ${p.heightCm} cm · goal ${p.goalWeight} kg in ${p.months} months</p>
      <div class="bar"><span style="width:${lv.pct * 100}%"></span></div>
      <small>Lv ${lv.level} ${lv.title} · ${lv.xp} XP</small>
    </div>
    <button class="btn ghost sm" data-action="edit-profile">Edit</button>
  </section>

  <section class="card identity">
    <p class="eyebrow">I’m becoming</p>
    <ul class="becoming">${identitiesOf(p).map(t => `<li>${esc(t[0].toUpperCase() + t.slice(1))}</li>`).join('')}</ul>
    ${p.why ? `<p class="muted">“${esc(p.why)}”</p>` : ''}
  </section>

  ${accountCard()}

  <h4 class="sec">🔔 Reminders</h4>
  <section class="card stack">
    ${perm === 'granted' ? '' : perm === 'unsupported'
      ? '<p class="warn">Notifications aren’t supported in this browser.</p>'
      : `<button class="btn block sky" data-action="notif-enable">🔔 Enable notifications</button>
         ${perm === 'denied' ? '<p class="warn small">Blocked. In Chrome tap ⋮ → Settings → Site settings → Notifications to allow.</p>' : ''}`}
    ${Object.entries(s.reminders).map(([id, r]) => `
      <div class="rem-row">
        <span class="rem-ic">${REMINDER_INFO[id].icon}</span>
        <div class="grow"><b>${REMINDER_INFO[id].label}</b>
          ${id === 'weighin' ? `<select data-change="rem-day" data-id="${id}">${DAYS.map((dname, i) => `<option value="${i + 1}" ${r.day === i + 1 ? 'selected' : ''}>${dname}</option>`).join('')}</select>` : ''}
        </div>
        <input type="time" value="${r.time}" data-change="rem-time" data-id="${id}">
        <label class="switch"><input type="checkbox" ${r.on ? 'checked' : ''} data-change="rem-on" data-id="${id}"><i></i></label>
      </div>`).join('')}
    ${perm === 'granted' ? `<p class="hint">${BG_TEXT[bgStatus] || ''}</p>
      <button class="btn ghost block" data-action="notif-test">Send a test notification</button>` : ''}
  </section>

  ${!isStandalone() ? `<h4 class="sec">📲 Install</h4>
  <section class="card stack">
    ${appCtx.installPrompt
      ? '<button class="btn block" data-action="install">Install Tiny Wins on this phone</button>'
      : '<p class="small">In Chrome: tap <b>⋮</b> → <b>Add to Home screen</b> / <b>Install app</b>. It opens full-screen like a real app and works offline.</p>'}
  </section>` : ''}

  <h4 class="sec">🛟 Hard times</h4>
  <section class="card">
    <div class="rem-row">
      <span class="rem-ic">🛟</span>
      <div class="grow"><b>Survival mode</b><small>New baby, sick, crazy week? One tiny win = a good day.</small></div>
      <label class="switch"><input type="checkbox" ${s.settings.survival ? 'checked' : ''} data-change="survival"><i></i></label>
    </div>
  </section>

  <h4 class="sec">🧠 The psychology inside</h4>
  <section class="card science">${SCIENCE.map(([t, d]) => `<details><summary>${esc(t)}</summary><p>${esc(d)}</p></details>`).join('')}</section>

  <h4 class="sec">💾 Your data</h4>
  <section class="card stack">
    <p class="small muted">Everything is stored only on this device. Export a backup now and then.</p>
    <div class="row gap"><button class="btn ghost grow" data-action="export">⬇️ Export</button>
      <label class="btn ghost grow">⬆️ Import<input type="file" accept="application/json" data-change="import" hidden></label></div>
    <button class="btn danger block" data-action="reset">Start over</button>
  </section>
  <p class="foot muted small">Tiny Wins · ~${fmtNum(plan.kcal)} kcal plan · Not medical advice. Check with your doctor before big diet changes.</p>
  `;
}

/* ---------- Sync / account ---------- */
function relTime(ts) {
  if (!ts) return 'not yet';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

function accountCard() {
  const a = auth();
  if (!a.signedIn) {
    return `<h4 class="sec">☁️ Sync across devices</h4>
    <section class="card stack">
      <p class="small muted">Create an account to back up your progress and pick it up on your phone, tablet or laptop. Your data is yours — stored on your own server.</p>
      <button class="btn block sky" data-action="auth-open">Sign in / Create account</button>
    </section>`;
  }
  const label = {
    syncing: '🔄 Syncing…', ok: '✅ All synced', error: `⚠️ ${a.error || 'Sync error'}`,
    offline: `📴 ${a.error || 'Offline — saved locally'}`, idle: 'Signed in',
  }[a.status] || 'Signed in';
  return `<h4 class="sec">☁️ Sync</h4>
    <section class="card stack">
      <div class="rem-row">
        <span class="rem-ic">👤</span>
        <div class="grow"><b>${esc(a.email)}</b><small>${esc(label)} · last synced ${relTime(a.lastSync)}</small></div>
      </div>
      <div class="row gap">
        <button class="btn ghost grow" data-action="sync-now" ${a.status === 'syncing' ? 'disabled' : ''}>Sync now</button>
        <button class="btn ghost grow" data-action="sign-out">Sign out</button>
      </div>
    </section>`;
}

export function openAuthSheet(mode = 'login') {
  const body = openSheet({
    html: authHtml(mode),
    onMount: el => el.querySelector('#au-email')?.focus(),
  });
  body.addEventListener('submit', e => e.preventDefault());
  body.addEventListener('click', e => {
    const modeBtn = e.target.closest('[data-mode]');
    if (modeBtn) { e.preventDefault(); body.innerHTML = authHtml(modeBtn.dataset.mode); body.querySelector('#au-email')?.focus(); }
  });
}

function authHtml(mode) {
  const reg = mode === 'register';
  return `<form class="auth stack" novalidate>
    <h2>${reg ? 'Create your account' : 'Welcome back'}</h2>
    <p class="muted small">${reg ? 'One account keeps your progress in sync across every device.' : 'Sign in to sync this device with your account.'}</p>
    <label class="field"><span>Email</span><input id="au-email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false"></label>
    <label class="field"><span>Password</span><input id="au-pass" type="password" autocomplete="${reg ? 'new-password' : 'current-password'}" placeholder="${reg ? 'At least 8 characters' : ''}"></label>
    ${reg ? '<label class="field"><span>Invite code <small>(if the server requires one)</small></span><input id="au-code" autocapitalize="off" spellcheck="false" placeholder="e.g. from whoever set up the server"></label>' : ''}
    <p class="auth-err" id="au-err" hidden></p>
    <button type="button" class="btn block lg" data-action="au-submit">${reg ? 'Create account' : 'Sign in'}</button>
    <p class="muted small center">${reg
      ? 'Already have an account? <button type="button" class="linkbtn" data-mode="login">Sign in</button>'
      : 'New here? <button type="button" class="linkbtn" data-mode="register">Create an account</button>'}</p>
  </form>`;
}

on('auth-open', () => openAuthSheet('login'));
on('sync-now', () => fullSync());
on('sign-out', async () => {
  if (!(await confirmSheet('Sign out? Your data stays on this device and back on your account.', { ok: 'Sign out' }))) return;
  await signOut();
  toast('Signed out.');
});

on('au-submit', async btn => {
  const sheet = btn.closest('.auth');
  if (!sheet) return;
  const err = sheet.querySelector('#au-err');
  const email = sheet.querySelector('#au-email').value.trim();
  const pass = sheet.querySelector('#au-pass').value;
  const codeEl = sheet.querySelector('#au-code');
  const reg = !!codeEl;
  const showErr = m => { err.textContent = m; err.hidden = false; };
  if (!email || !pass) return showErr('Enter your email and password.');
  if (reg && pass.length < 8) return showErr('Password must be at least 8 characters.');
  btn.disabled = true;
  btn.textContent = reg ? 'Creating…' : 'Signing in…';
  const r = reg ? await register(email, pass, codeEl.value.trim()) : await login(email, pass);
  if (r.ok) {
    closeSheet();
    toast(reg ? '<b>Account created 🎉</b> Your progress is backing up.' : '<b>Signed in ✓</b> Syncing your data…', { kind: 'green' });
  } else {
    showErr(r.error);
    btn.disabled = false;
    btn.textContent = reg ? 'Create account' : 'Sign in';
  }
});

/* ---------- Actions ---------- */
on('notif-enable', async () => {
  const p = await enableNotifications(getState());
  if (p === 'denied') toast('Blocked. Allow in Chrome → Site settings → Notifications.', { kind: 'warn', ms: 4000 });
  bgStatus = null;
  commit(() => {});
});
on('notif-test', async () => {
  await registerPeriodic();
  await testNotification(getState());
  toast('Sent! Check your notification shade.');
});
on('rem-time', el => commit(s => { s.reminders[el.dataset.id].time = el.value; }));
on('rem-on', el => commit(s => { s.reminders[el.dataset.id].on = el.checked; }));
on('rem-day', el => commit(s => { s.reminders[el.dataset.id].day = +el.value; }));
on('survival', el => commit(s => {
  s.settings.survival = el.checked;
  const d = (s.days[today()] ||= { habits: {}, meals: {}, lucky: {} });
  if (el.checked) d.survival = true; else delete d.survival;
}));

on('export', () => {
  const json = JSON.stringify(getState(), null, 2);
  // Some embedded viewers block downloads, so also put the backup on the clipboard.
  navigator.clipboard?.writeText(json).then(() => toast('Backup copied to clipboard ✓')).catch(() => {});
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `tinywins-backup-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
on('import', async el => {
  const f = el.files?.[0];
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (data.v !== 1 || !data.profile) throw new Error('bad file');
    if (!(await confirmSheet('Replace all current data with this backup?', { ok: 'Replace', danger: true }))) return;
    replaceState(data);
    toast('Backup restored ✓');
  } catch {
    toast('That file isn’t a Tiny Wins backup.', { kind: 'warn' });
  }
});
on('reset', async () => {
  if (!(await confirmSheet('Delete all your progress and start over? Export a backup first if you might want it.', { ok: 'Delete everything', danger: true }))) return;
  resetState();
  location.hash = '';
  location.reload();
});

on('edit-profile', () => {
  const p = getState().profile;
  const mine = identitiesOf(p);
  const own = mine.find(t => !IDENTITIES.includes(t)) || '';
  const body = openSheet({
    html: `<h2>Edit profile</h2>
    <div class="stack">
      <label class="field"><span>Name</span><input id="e-name" value="${esc(p.name)}"></label>
      <div class="grid3">
        <label class="field"><span>Age</span><input id="e-age" type="number" value="${p.age}"></label>
        <label class="field"><span>Height cm</span><input id="e-height" type="number" value="${p.heightCm}"></label>
        <label class="field"><span>Months</span><input id="e-months" type="number" min="3" max="24" value="${p.months}"></label>
      </div>
      <div class="grid2">
        <label class="field"><span>Start weight</span><input id="e-start" type="number" step="0.1" value="${p.startWeight}"></label>
        <label class="field"><span>Goal weight</span><input id="e-goal" type="number" step="0.1" value="${p.goalWeight}"></label>
      </div>
      <div class="field"><span>I’m becoming… (pick all that fit)</span><div class="chips" id="e-ids">${IDENTITIES.map(t =>
        `<label class="chip ${mine.includes(t) ? 'on' : ''}"><input type="checkbox" value="${esc(t)}" ${mine.includes(t) ? 'checked' : ''} hidden>${esc(t)}</label>`).join('')}</div>
        <input id="e-identity" value="${esc(own)}" placeholder="Add your own (optional)"></div>
      <label class="field"><span>My why</span><textarea id="e-why" rows="2">${esc(p.why)}</textarea></label>
      <div class="field"><span>My life</span><div class="chips" id="e-tags">${LIFE_TAGS.map(([id, l]) =>
        `<label class="chip ${p.tags.includes(id) ? 'on' : ''}"><input type="checkbox" value="${id}" ${p.tags.includes(id) ? 'checked' : ''} hidden>${l}</label>`).join('')}</div></div>
      <button class="btn block lg" id="e-save">Save</button>
    </div>`,
  });
  body.addEventListener('change', e => {
    if (e.target.type === 'checkbox') e.target.parentElement.classList.toggle('on', e.target.checked);
  });
  body.querySelector('#e-save').addEventListener('click', () => {
    const v = id => body.querySelector(id).value;
    const goal = +v('#e-goal'), start = +v('#e-start');
    if (!(goal > 30 && start > goal)) return toast('Goal weight should be below your start weight.', { kind: 'warn' });
    const ids = [...body.querySelectorAll('#e-ids input:checked')].map(i => i.value);
    if (v('#e-identity').trim()) ids.push(v('#e-identity').trim());
    if (!ids.length) return toast('Pick at least one “I’m becoming”, or write your own.', { kind: 'warn' });
    commit(s => {
      Object.assign(s.profile, {
        name: v('#e-name').trim() || s.profile.name, age: +v('#e-age'), heightCm: +v('#e-height'),
        months: Math.min(24, Math.max(3, +v('#e-months'))), startWeight: start, goalWeight: goal,
        identities: ids, why: v('#e-why'),
        tags: [...body.querySelectorAll('#e-tags input:checked')].map(i => i.value),
      });
      delete s.profile.identity;
    });
    closeSheet();
    toast('Profile updated ✓');
  });
});
