// Pure calculations over app state. No DOM here.
import { HABITS, STAGES, LEVELS, BADGES } from './data.js';
import { today, addDays, daysBetween, weekStart, parseKey } from './util.js';

const KCAL_PER_KG = 7700;

export function computePlan(p, currentWeight) {
  const w = currentWeight ?? p.startWeight;
  const bmr = 10 * w + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'female' ? -161 : 5);
  const tdee = bmr * ({ desk: 1.2, light: 1.375, active: 1.55 }[p.activity] || 1.2);
  const totalLoss = Math.max(0, p.startWeight - p.goalWeight);
  const weeks = p.months * 4.345;
  const weekly = totalLoss / weeks;
  const deficit = (weekly * KCAL_PER_KG) / 7;
  const floor = p.sex === 'female' ? 1300 : 1600;
  const kcal = Math.max(floor, Math.round((tdee - deficit) / 50) * 50);
  const protein = Math.round((p.goalWeight * 1.6) / 5) * 5;
  const water = Math.min(3.5, Math.round(w * 0.03 * 10) / 10);
  const bmi = w / (p.heightCm / 100) ** 2;
  return {
    bmr, tdee, kcal, protein, water, bmi, totalLoss, weekly, deficit,
    monthly: totalLoss / p.months,
    aggressive: weekly > w * 0.01,
    targetDate: addDays(p.startDate || today(), Math.round(weeks * 7)),
  };
}

const DEFAULT_IDENTITY = 'A healthier version of me';
// Profiles from before multi-select stored a single `identity` string.
export function identitiesOf(p) {
  if (p.identities?.length) return p.identities;
  return [p.identity || DEFAULT_IDENTITY];
}

export const bmiLabel = b => b < 18.5 ? 'Under' : b < 25 ? 'Healthy' : b < 30 ? 'Overweight' : 'Obese';

export function habitsForStage(idx) {
  return STAGES.slice(0, idx + 1).flatMap(s => s.habits.map(id => HABITS[id]));
}

export function stageAt(state, key) {
  let idx = 0;
  for (const h of state.stage.history) if (h.start <= key) idx = h.index;
  return idx;
}

// 'full' | 'mini' | null
export function habitMark(state, key, h) {
  const day = state.days[key];
  if (h.auto === 'meals') {
    const n = Object.values(day?.meals || {}).filter(Boolean).length;
    return n >= 2 ? 'full' : n === 1 ? 'mini' : null;
  }
  return day?.habits?.[h.id] || null;
}

export function dayStatus(state, key) {
  const daily = habitsForStage(stageAt(state, key)).filter(h => h.type === 'daily');
  const done = daily.filter(h => habitMark(state, key, h)).length;
  const total = daily.length;
  const survival = !!state.days[key]?.survival;
  const good = survival ? done >= 1 : total > 0 && done / total >= 0.6;
  return { done, total, good, survival };
}

export function computeStreak(state) {
  const start = state.profile.startDate;
  const t = today();
  let streak = 0, best = 0, freezes = 0, run = 0;
  const frozen = new Set();
  const missed = new Set();
  for (let k = start; k < t; k = addDays(k, 1)) {
    if (dayStatus(state, k).good) {
      streak++; run++;
      if (run % 7 === 0 && freezes < 2) freezes++;
    } else if (freezes > 0 && streak > 0) {
      freezes--; run = 0; frozen.add(k);
    } else {
      streak = 0; run = 0; missed.add(k);
    }
    best = Math.max(best, streak);
  }
  const ts = dayStatus(state, t);
  const shown = streak + (ts.good ? 1 : 0);
  const y = addDays(t, -1);
  return {
    streak: shown, best: Math.max(best, shown), freezes, frozen, missed,
    todayStatus: ts, missedYesterday: missed.has(y),
  };
}

// How many times a weekly habit was done in the week containing `key`.
export function weekCount(state, h, key = today()) {
  const ws = weekStart(key);
  if (h.auto === 'weight') return state.weights.some(w => weekStart(w.date) === ws) ? 1 : 0;
  let n = 0;
  for (let i = 0; i < 7; i++) if (state.days[addDays(ws, i)]?.habits?.[h.id]) n++;
  return n;
}

export function computeXP(state) {
  let xp = 0;
  for (const [k, day] of Object.entries(state.days)) {
    const hs = habitsForStage(stageAt(state, k));
    let allDaily = true, anyDaily = false;
    for (const h of hs) {
      if (h.type === 'once' || h.auto === 'weight') continue;
      const m = habitMark(state, k, h);
      if (h.type === 'daily') { anyDaily = true; if (!m) allDaily = false; }
      if (m === 'full') xp += 10;
      else if (m === 'mini') xp += 6;
      if (m && day.lucky?.[h.id]) xp += day.lucky[h.id];
    }
    if (anyDaily && allDaily) xp += 20;
    xp += Object.values(day.meals || {}).filter(Boolean).length * 3;
  }
  const pts = { beat: 15, smart: 10, small: 8, ate: 3 };
  xp += state.cravings.reduce((a, c) => a + (pts[c.outcome] || 0), 0);
  xp += new Set(state.weights.map(w => weekStart(w.date))).size * 20;
  xp += Object.keys(state.quests).length * 30;
  xp += state.workouts.length * 15;
  xp += (state.stage.history.length - 1) * 100;
  xp += Object.keys(state.badges).length * 25;
  return xp;
}

export function levelFor(xp) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++;
  const cur = LEVELS[i][0];
  const next = LEVELS[i + 1]?.[0] ?? cur;
  return {
    level: i + 1, title: LEVELS[i][1], xp, cur, next,
    pct: next > cur ? (xp - cur) / (next - cur) : 1,
  };
}

export function stageProgress(state) {
  const idx = state.stage.index;
  const st = STAGES[idx];
  const start = state.stage.history.at(-1).start;
  const t = today();
  const daysIn = daysBetween(start, t) + 1;
  let good = 0;
  for (let k = start; k <= t; k = addDays(k, 1)) if (dayStatus(state, k).good) good++;
  const questsLeft = st.habits.filter(id => HABITS[id].type === 'once' && !state.quests[id]).length;
  const isLast = idx === STAGES.length - 1;
  return {
    idx, st, daysIn, good, questsLeft, isLast,
    eligible: !isLast && daysIn >= st.minDays && good >= st.goodDays && questsLeft === 0,
  };
}

export const sortedWeights = state => [...state.weights].sort((a, b) => a.date.localeCompare(b.date));
export function latestWeight(state) {
  const w = sortedWeights(state);
  return w.length ? w.at(-1).kg : state.profile.startWeight;
}

// Exponential moving average: smooths out daily water-weight noise.
export function trendLine(weights, alpha = 0.35) {
  let ema = null;
  return weights.map(w => {
    ema = ema == null ? w.kg : ema + alpha * (w.kg - ema);
    return { date: w.date, kg: ema };
  });
}

export function projection(state) {
  const ws = sortedWeights(state).slice(-8);
  if (ws.length < 3) return null;
  const span = daysBetween(ws[0].date, ws.at(-1).date);
  if (span < 14) return null;
  const xs = ws.map(w => daysBetween(ws[0].date, w.date));
  const ys = ws.map(w => w.kg);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  const slope = num / den; // kg per day
  const latest = ys.at(-1);
  const left = latest - state.profile.goalWeight;
  if (slope >= 0 || left <= 0) return { slope, date: null };
  return { slope, date: addDays(ws.at(-1).date, Math.round(left / -slope)) };
}

export function badgeContext(state, streakInfo) {
  const p = state.profile;
  const lost = p.startWeight - latestWeight(state);
  const anyHabit = Object.values(state.days).some(d => Object.keys(d.habits || {}).length || Object.values(d.meals || {}).some(Boolean));
  const t = today();
  const y = addDays(t, -1);
  return {
    anyHabit,
    best: streakInfo.best,
    lost, lostPct: (lost / p.startWeight) * 100,
    totalLoss: p.startWeight - p.goalWeight,
    beat: state.cravings.filter(c => c.outcome === 'beat').length,
    weighins: new Set(state.weights.map(w => weekStart(w.date))).size,
    workouts: state.workouts.length,
    stage: state.stage.index,
    comeback: streakInfo.missed.has(y) && streakInfo.todayStatus.good,
    survivalUsed: Object.values(state.days).some(d => d.survival),
  };
}

export const newBadges = (state, ctx) => BADGES.filter(b => !state.badges[b.id] && b.check(ctx));

// Most common craving hour, e.g. "21:00–22:00".
export function dangerHour(state) {
  if (state.cravings.length < 3) return null;
  const counts = {};
  for (const c of state.cravings) {
    const h = new Date(c.ts).getHours();
    counts[h] = (counts[h] || 0) + 1;
  }
  const [h] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const pad = n => String(n % 24).padStart(2, '0');
  return `${pad(+h)}:00–${pad(+h + 1)}:00`;
}

export const dayOfWeek = key => (parseKey(key).getDay() + 6) % 7; // 0 = Monday
