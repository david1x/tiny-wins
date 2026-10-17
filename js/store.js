// App state persisted to localStorage. commit() is the only way to mutate it.
import { today } from './util.js';

const KEY = 'tinywins.v1';
const hooks = [];

export const defaultReminders = () => ({
  morning: { on: true, time: '08:00' },
  lunch: { on: true, time: '13:30' },
  evening: { on: true, time: '21:00' },
  checkin: { on: true, time: '21:45' },
  weighin: { on: true, time: '07:30', day: 1 }, // 1 = Monday … 7 = Sunday
});

const fresh = () => ({
  v: 1,
  onboarded: false,
  profile: null,
  stage: { index: 0, history: [] },
  days: {},
  quests: {},
  weights: [],
  cravings: [],
  workouts: [],
  badges: {},
  ifthen: [],
  reminders: defaultReminders(),
  settings: { survival: false, dismissed: {} },
  lastReview: null,
  updatedAt: 0, // bumped on every change; used for cross-device sync (newest wins)
});

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && raw.v === 1) {
      const base = fresh();
      return { ...base, ...raw, settings: { ...base.settings, ...raw.settings }, reminders: { ...base.reminders, ...raw.reminders } };
    }
  } catch { /* corrupted or unavailable storage: start fresh */ }
  return fresh();
}

let state = load();

export const getState = () => state;

export function ensureDay(key = today()) {
  const d = (state.days[key] ||= { habits: {}, meals: {}, lucky: {} });
  d.habits ||= {}; d.meals ||= {}; d.lucky ||= {};
  if (key === today()) {
    if (state.settings.survival) d.survival = true;
    else delete d.survival;
  }
  return d;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota or private mode */ }
}

// hooks receive the state; they run after every commit (celebrations, render, reminder sync).
export const onCommit = fn => hooks.push(fn);

export function commit(mutator) {
  mutator(state);
  state.updatedAt = Date.now();
  save();
  hooks.forEach(fn => fn(state));
}

export function replaceState(next) {
  state = { ...fresh(), ...next };
  save();
  hooks.forEach(fn => fn(state));
}

export function resetState() {
  state = fresh();
  save();
}
