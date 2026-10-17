import { getState, onCommit, save } from './store.js';
import { actions, appCtx } from './actions.js';
import { toast, confetti } from './ui.js';
import { computeXP, levelFor, computeStreak, badgeContext, newBadges } from './logic.js';
import { syncReminders, startTicker } from './notify.js';
import { today } from './util.js';
import { renderToday } from './views/today.js';
import { renderJourney } from './views/journey.js';
import { renderProgress } from './views/progress.js';
import { renderMe } from './views/me.js';
import { renderOnboarding } from './views/onboarding.js';
import { openSOS } from './views/sos.js';
import { initSync } from './sync.js';


const VIEWS = { today: renderToday, journey: renderJourney, progress: renderProgress, me: renderMe };
const TABS = [['today', '🏠', 'Today'], ['journey', '🗺️', 'Journey'], ['sos'], ['progress', '📈', 'Progress'], ['me', '👤', 'Me']];

const route = () => (location.hash.replace(/^#\/?/, '') || 'today').split('?')[0];

function renderTabbar(active) {
  document.getElementById('tabbar').innerHTML = TABS.map(([id, icon, label]) => id === 'sos'
    ? `<button class="sos-fab" data-action="sos" aria-label="Craving SOS"><span>🆘</span><small>Craving</small></button>`
    : `<a href="#/${id}" class="tab ${active === id ? 'on' : ''}"><span>${icon}</span><small>${label}</small></a>`).join('');
}

let renderedDay = today();

export function render() {
  const s = getState();
  const app = document.getElementById('app');
  const bar = document.getElementById('tabbar');
  renderedDay = today();
  if (!s.onboarded) {
    bar.hidden = true;
    renderOnboarding(app);
    return;
  }
  let r = route();
  if (r === 'sos') {
    history.replaceState(null, '', '#/today');
    r = 'today';
    setTimeout(openSOS, 60);
  }
  if (!VIEWS[r]) r = 'today';
  bar.hidden = false;
  renderTabbar(r);
  app.dataset.view = r;
  app.innerHTML = VIEWS[r](s, appCtx);
}

/* ---------- Celebrations after every change ---------- */
let lastLevel = null;
onCommit(s => {
  if (s.onboarded) {
    const st = computeStreak(s);
    const fresh = newBadges(s, badgeContext(s, st));
    if (fresh.length) {
      fresh.forEach(b => { s.badges[b.id] = today(); });
      save();
      fresh.forEach((b, i) => setTimeout(() => toast(`<b>${b.icon} New badge!</b> ${b.name}`, { kind: 'gold', ms: 3500 }), 400 + i * 900));
    }
    const lv = levelFor(computeXP(s));
    if (lastLevel && lv.level > lastLevel) {
      setTimeout(() => { confetti(140); toast(`<b>⬆️ Level ${lv.level}!</b> You’re now a ${lv.title}`, { kind: 'violet', ms: 4000 }); }, 300);
    }
    lastLevel = lv.level;
    syncReminders(s);
  }
  render();
});

/* ---------- Global event delegation ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = actions[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-change]');
  if (el) actions[el.dataset.change]?.(el, e);
});

document.addEventListener('input', e => {
  const el = e.target.closest('[data-input]');
  if (el) actions[el.dataset.input]?.(el, e);
});

window.addEventListener('hashchange', () => { render(); window.scrollTo({ top: 0 }); });

// Re-render when the day rolls over while the app stays open.
const checkDay = () => { if (today() !== renderedDay) render(); };
document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDay(); });
setInterval(checkDay, 60000);

/* ---------- PWA install + service worker ---------- */
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  appCtx.installPrompt = e;
  render();
});
window.addEventListener('appinstalled', () => {
  appCtx.installPrompt = null;
  toast('<b>📲 Installed!</b> Find Tiny Wins on your home screen.');
  render();
});

// Sandboxed frames (e.g. embedded previews) can throw just for touching navigator.serviceWorker.
try {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW failed', err));
    startTicker();
  }
} catch (err) {
  console.warn('Service worker unavailable', err);
}

const s = getState();
if (s.onboarded) {
  lastLevel = levelFor(computeXP(s)).level;
  syncReminders(s);
}
render();

// Re-render when sync status changes (status pills, pulled data landing).
window.addEventListener('tinywins-sync', render);
initSync(onCommit);
