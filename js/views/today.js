import { commit, ensureDay, getState } from '../store.js';
import { on, go, appCtx } from '../actions.js';
import { HABITS, STAGES, BOOSTS, TIPS, WORKOUTS } from '../data.js';
import {
  habitsForStage, habitMark, computeStreak, computeXP, levelFor, weekCount, stageProgress,
  dayStatus, sortedWeights, dayOfWeek,
} from '../logic.js';
import { ring, toast, confetti, openSheet, closeSheet, openWorkout } from '../ui.js';
import { esc, today, addDays, weekStart, pickDaily, rand, vibrate, fmtKg, isStandalone } from '../util.js';
import { notifPermission, enableNotifications } from '../notify.js';
import { openWeightSheet } from './progress.js';

const MEALS = [['b', 'Breakfast', '🍳'], ['l', 'Lunch', '🥪'], ['d', 'Dinner', '🍝'], ['s', 'Snacks', '🍿']];
const MEAL_CYCLE = ['', 'g', 'y', 'r'];
const MEAL_LABEL = { '': 'Tap to rate', g: 'On plan', y: 'Okay', r: 'Off plan' };
const ALL_DONE = [
  'Look at you go! 🎉', 'Every tiny win is a vote for the new you.', 'That’s how habits are built: boring and daily. Love it.',
  'Your future self just high-fived you.', 'Done before the excuses even woke up.', 'Streak secured. Enjoy your evening 😎',
];

const greet = () => {
  const h = new Date().getHours();
  return h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const tagged = (arr, tags = []) => arr.filter(x => !x.tag || tags.includes(x.tag));

function habitRow(s, h, t, focus = false) {
  const weekly = h.type === 'weekly';
  const wc = weekly ? weekCount(s, h, t) : 0;
  const isWeight = h.auto === 'weight';
  const mark = isWeight ? (wc ? 'full' : null) : habitMark(s, t, h);
  const auto = !!h.auto;
  const streakDays = Object.keys(s.days).filter(k => habitMark(s, k, h)).length;
  const autopilot = !weekly && streakDays >= 21;
  return `<div class="habit ${mark ? 'done' : ''} ${focus ? 'focus' : ''}">
    <button class="chk ${mark === 'mini' ? 'mini' : ''}" data-action="${isWeight ? 'weigh' : auto ? 'auto-habit' : 'toggle-habit'}" data-id="${h.id}" aria-label="Toggle ${esc(h.title)}">
      ${mark ? (mark === 'mini' ? '½' : '✓') : h.icon}
    </button>
    <div class="meta" data-action="habit-info" data-id="${h.id}">
      <b>${esc(h.title)} ${autopilot ? '<span class="tag auto">🔒 autopilot</span>' : ''}${weekly ? `<span class="tag">${wc}/${h.target} this week</span>` : ''}</b>
      <small>${isWeight && mark ? 'Done this week ✓ Next one Monday.' : mark === 'mini' ? 'Mini version done. Still a win!' : esc(h.cue)}</small>
    </div>
    ${!mark && !auto && h.mini ? `<button class="mini-btn" data-action="mini-habit" data-id="${h.id}" title="${esc(h.mini)}">mini</button>` : ''}
    ${isWeight && !mark ? '<button class="mini-btn go" data-action="weigh">Log</button>' : ''}
    ${h.workout && !mark ? `<button class="mini-btn go" data-action="workout" data-id="${h.workout}">▶</button>` : ''}
  </div>`;
}

function weekReviewCard(s, t) {
  const ws = weekStart(t);
  if (dayOfWeek(t) > 1 || s.lastReview === ws || s.profile.startDate >= ws) return '';
  const prev = addDays(ws, -7);
  let good = 0;
  for (let i = 0; i < 7; i++) {
    const k = addDays(prev, i);
    if (k >= s.profile.startDate && dayStatus(s, k).good) good++;
  }
  const beat = s.cravings.filter(c => c.outcome === 'beat' && c.ts >= new Date(prev).getTime() && c.ts < new Date(ws).getTime()).length;
  const ws2 = sortedWeights(s);
  const lastW = ws2.filter(w => w.date < ws).at(-1);
  const prevW = ws2.filter(w => w.date < prev).at(-1);
  const delta = lastW && prevW ? lastW.kg - prevW.kg : null;
  return `<div class="card review">
    <p class="eyebrow">📅 Weekly review · fresh start</p>
    <h3>${good >= 5 ? 'Strong week!' : good >= 3 ? 'Solid week.' : 'New week, clean slate.'}</h3>
    <div class="pp-grid">
      <div><b>${good}/7</b><small>good days</small></div>
      <div><b>${beat}</b><small>cravings beaten</small></div>
      <div><b>${delta == null ? '–' : (delta > 0 ? '+' : '') + fmtKg(delta)}</b><small>kg change</small></div>
    </div>
    <p class="muted">${good >= 5 ? 'Keep the same rhythm. Boring is good.' : 'Mondays are a natural restart. Pick ONE habit to nail this week, and use the mini versions on hard days.'}</p>
    <button class="btn block" data-action="dismiss-review">Let’s go 💪</button>
  </div>`;
}

export function renderToday(s, ctx) {
  const t = today();
  const p = s.profile;
  const st = computeStreak(s);
  const lv = levelFor(computeXP(s));
  const sp = stageProgress(s);
  const stage = STAGES[s.stage.index];
  const habits = habitsForStage(s.stage.index);
  const isNew = h => stage.habits.includes(h.id);
  const focusHabits = habits.filter(h => isNew(h) && h.type !== 'once');
  const daily = habits.filter(h => !isNew(h) && h.type === 'daily');
  const weekly = habits.filter(h => !isNew(h) && h.type === 'weekly');
  const quests = habits.filter(h => h.type === 'once' && !s.quests[h.id]);
  const ts = st.todayStatus;
  const day = s.days[t] || {};
  const boost = pickDaily(tagged(BOOSTS, p.tags), 'boost').t.replace('{name}', esc(p.name));
  const tip = pickDaily(tagged(TIPS, p.tags), 'tip').t;
  const allDone = ts.total > 0 && ts.done === ts.total;
  const showInstall = ctx.installPrompt && !isStandalone() && !s.settings.dismissed.install;
  const showNotif = notifPermission() === 'default' && !s.settings.dismissed.notif;

  return `
  <header class="hero">
    <div class="row between">
      <div><p class="hero-sub">${greet()},</p><h1>${esc(p.name)}</h1></div>
      <div class="hero-chips">
        <span class="hchip" title="Streak">🔥 ${st.streak}</span>
        ${st.freezes ? `<span class="hchip" title="Streak freezes: a missed day won’t break your streak">❄️ ${st.freezes}</span>` : ''}
      </div>
    </div>
    <div class="lvl" data-action="go" data-to="me">
      <span>Lv ${lv.level} · ${lv.title}</span>
      <div class="bar"><span style="width:${lv.pct * 100}%"></span></div>
      <small>${lv.xp} / ${lv.next} XP</small>
    </div>
    <p class="boost">“${boost}”</p>
  </header>

  ${s.settings.survival ? `<div class="banner sky">🛟 <div><b>Survival mode is on.</b> One tiny win = a good day. Your streak is safe. <a href="#" data-action="survival-off">Turn off</a></div></div>` : ''}
  ${st.missedYesterday && !ts.good ? `<div class="banner warm">🔁 <div><b>Yesterday slipped. Totally normal.</b> The only rule: never miss twice. Just do one mini version today.</div></div>` : ''}
  ${showInstall ? `<div class="banner">📲 <div><b>Install Tiny Wins</b> for reminders & one-tap access.</div><button class="btn sm" data-action="install">Install</button><button class="x" data-action="dismiss" data-k="install">✕</button></div>` : ''}
  ${showNotif ? `<div class="banner">🔔 <div><b>Turn on reminders.</b> A nudge at the right moment beats willpower.</div><button class="btn sm" data-action="notif-on">Enable</button><button class="x" data-action="dismiss" data-k="notif">✕</button></div>` : ''}

  ${weekReviewCard(s, t)}

  ${sp.eligible ? `<div class="card levelup-card">
      <div class="big-emoji pop">🎉</div>
      <h3>Stage ${sp.idx + 1} complete!</h3>
      <p>You had ${sp.good} good days. Ready to unlock <b>${STAGES[sp.idx + 1].icon} ${STAGES[sp.idx + 1].name}</b>?</p>
      <button class="btn block" data-action="go" data-to="journey">See what’s next →</button>
    </div>` : ''}

  <section class="card today-card">
    <div class="row gap">
      ${ring(ts.total ? ts.done / ts.total : 0, { label: `${ts.done}/${ts.total}`, sub: 'today' })}
      <div class="grow">
        <p class="eyebrow">${stage.icon} Stage ${s.stage.index + 1} · ${esc(stage.name)}</p>
        <h3>${allDone ? pickDaily(ALL_DONE, 'done') : ts.good ? 'Good day locked in 🔒' : `${Math.max(1, Math.ceil(ts.total * 0.6) - ts.done)} tiny win${Math.ceil(ts.total * 0.6) - ts.done === 1 ? '' : 's'} to a good day`}</h3>
        <small class="muted">Day ${sp.daysIn} of this stage · ${sp.good}/${sp.st.goodDays} good days</small>
      </div>
    </div>
  </section>

  ${focusHabits.length ? `<h4 class="sec">✨ This stage’s focus</h4>
    <div class="stack">${focusHabits.map(h => habitRow(s, h, t, true)).join('')}</div>` : ''}

  ${quests.length ? `<h4 class="sec">🎯 One-time quests <small>+30 XP each</small></h4>
    <div class="stack">${quests.map(h => `<div class="habit quest">
      <span class="chk">${h.icon}</span>
      <div class="meta" data-action="habit-info" data-id="${h.id}"><b>${esc(h.title)}</b><small>${esc(h.cue)}</small></div>
      <button class="btn sm" data-action="quest" data-id="${h.id}">Done</button></div>`).join('')}</div>` : ''}

  ${daily.length || weekly.length ? `<h4 class="sec">🧱 Your foundations</h4>
    <div class="stack">${[...daily, ...weekly].map(h => habitRow(s, h, t)).join('')}</div>` : ''}

  <h4 class="sec">🍽️ Rate your meals <small>one tap each</small></h4>
  <div class="meals" id="meals">${MEALS.map(([k, label, icon]) => {
    const v = day.meals?.[k] || '';
    return `<button class="meal m-${v || 'none'}" data-action="meal" data-k="${k}">
      <span class="meal-ic">${icon}</span><b>${label}</b><small>${MEAL_LABEL[v]}</small></button>`;
  }).join('')}</div>
  <p class="hint">🟢 on plan · 🟡 okay · 🔴 off plan. Honest beats perfect. Every rating earns XP.</p>

  <h4 class="sec">⚡ Quick moves</h4>
  <div class="moves">${Object.entries(WORKOUTS).map(([id, w]) => `
    <button class="move" data-action="workout" data-id="${id}"><span>${w.icon}</span><b>${w.name}</b><small>${w.blurb}</small></button>`).join('')}
  </div>

  <div class="card tip"><p class="eyebrow">💡 Tip of the day</p><p>${esc(tip)}</p></div>
  <button class="btn ghost block" data-action="survival-toggle">${s.settings.survival ? '🛟 Survival mode: ON' : '🛟 Rough week? Turn on survival mode'}</button>
  `;
}

/* ---------- Actions ---------- */
function markHabit(id, val) {
  const t = today();
  let lucky = false;
  commit(s => {
    const d = ensureDay(t);
    if (val) {
      d.habits[id] = val;
      if (!(id in d.lucky)) {
        lucky = Math.random() < 0.15;
        d.lucky[id] = lucky ? 10 : 0;
      }
    } else {
      delete d.habits[id];
    }
  });
  if (!val) return;
  vibrate(30);
  const st = computeStreak(getState());
  if (st.todayStatus.done === st.todayStatus.total) {
    confetti(120);
    toast(`<b>All tiny wins done!</b> +20 XP bonus 🎉`, { kind: 'green' });
  } else if (lucky) {
    toast('<b>🍀 Lucky bonus!</b> +10 XP', { kind: 'gold' });
  } else {
    toast(val === 'mini' ? '½ Mini win! It still counts. +6 XP' : rand(['Nice! +10 XP', 'Tiny win ✓ +10 XP', 'Boom. +10 XP', 'That’s a vote for the new you. +10 XP']));
  }
}

on('toggle-habit', el => {
  const id = el.dataset.id;
  const cur = getState().days[today()]?.habits?.[id];
  markHabit(id, cur ? null : 'full');
});
on('mini-habit', el => markHabit(el.dataset.id, 'mini'));
on('auto-habit', () => {
  document.getElementById('meals')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  toast('Rate 2 meals below to tick this one ✓');
});

on('meal', el => {
  const k = el.dataset.k;
  commit(() => {
    const d = ensureDay(today());
    const cur = d.meals[k] || '';
    d.meals[k] = MEAL_CYCLE[(MEAL_CYCLE.indexOf(cur) + 1) % MEAL_CYCLE.length];
    if (!d.meals[k]) delete d.meals[k];
  });
  vibrate(15);
  const v = getState().days[today()]?.meals?.[k];
  if (v === 'r') toast('Thanks for being honest. That’s the real habit. Next meal is a fresh start.', { ms: 3200 });
});

on('quest', el => {
  const h = HABITS[el.dataset.id];
  commit(s => { s.quests[h.id] = today(); });
  confetti(100);
  toast(`<b>${h.icon} Quest complete!</b> +30 XP. You just made tomorrow easier.`, { kind: 'green' });
});

on('habit-info', el => {
  const h = HABITS[el.dataset.id];
  openSheet({
    html: `<div class="info">
      <div class="big-emoji">${h.icon}</div>
      <h2>${esc(h.title)}</h2>
      <div class="cue"><small>YOUR TRIGGER</small><p>${esc(h.cue)}</p></div>
      ${h.mini ? `<div class="cue mini"><small>BAD-DAY MINI VERSION</small><p>${esc(h.mini)}</p></div>` : ''}
      <p class="why">🧠 ${esc(h.why)}</p>
      ${h.workout ? `<button class="btn block" data-action="workout" data-id="${h.workout}">▶ Start guided timer</button>` : ''}
      <button class="btn ghost block" data-close>Got it</button>
    </div>`,
  });
});

on('workout', el => {
  const id = el.dataset.id;
  openWorkout(WORKOUTS[id], () => {
    commit(s => {
      s.workouts.push({ ts: Date.now(), id });
      const d = ensureDay(today());
      const active = new Set(habitsForStage(s.stage.index).map(h => h.id));
      if (id === 'strength5' && active.has('strength')) d.habits.strength = 'full';
      if (id === 'walk10' && active.has('walk')) d.habits.walk = 'full';
      if (id === 'desk2' && active.has('desk')) {
        d.deskBreaks = (d.deskBreaks || 0) + 1;
        d.habits.desk = d.deskBreaks >= 2 ? 'full' : 'mini';
      }
      for (const hid of ['strength', 'walk', 'desk']) if (d.habits[hid] && !(hid in d.lucky)) d.lucky[hid] = 0;
    });
  });
});

on('weigh', () => openWeightSheet());
on('go', el => go(el.dataset.to));
on('dismiss', el => commit(s => { s.settings.dismissed[el.dataset.k] = true; }));
on('dismiss-review', () => commit(s => { s.lastReview = weekStart(today()); }));
on('notif-on', async () => {
  const p = await enableNotifications(getState());
  if (p === 'denied') toast('Blocked. Allow notifications in Chrome → Site settings.', { kind: 'warn', ms: 4000 });
  commit(() => {});
});
on('install', async (el, e) => {
  const ctx = appCtx;
  if (!ctx.installPrompt) return;
  ctx.installPrompt.prompt();
  await ctx.installPrompt.userChoice;
  ctx.installPrompt = null;
  commit(() => {});
});

function setSurvival(onOff) {
  commit(s => {
    s.settings.survival = onOff;
    ensureDay(today());
  });
  toast(onOff
    ? '<b>🛟 Survival mode on.</b> One tiny win a day keeps your streak. Turning this on instead of quitting is a pro move.'
    : '<b>Back to normal mode.</b> Welcome back 💪', { ms: 4200 });
}
on('survival-toggle', () => setSurvival(!getState().settings.survival));
on('survival-off', () => setSurvival(false));
on('close-sheet', () => closeSheet());
