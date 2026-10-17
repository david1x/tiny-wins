import { commit, getState } from '../store.js';
import { on } from '../actions.js';
import { STAGES, HABITS } from '../data.js';
import { stageProgress, computePlan, latestWeight } from '../logic.js';
import { confetti, toast, ring } from '../ui.js';
import { esc, today, fmtNum, fmtDate } from '../util.js';

const habitChips = st => st.habits.map(id => `<span class="chip">${HABITS[id].icon} ${esc(HABITS[id].title)}</span>`).join('');

export function renderJourney(s) {
  const sp = stageProgress(s);
  const plan = computePlan(s.profile, latestWeight(s));
  const cur = s.stage.index;
  const dayPct = Math.min(1, sp.daysIn / sp.st.minDays);
  const goodPct = Math.min(1, sp.good / sp.st.goodDays);

  return `
  <h1 class="page-title">Your journey</h1>
  <p class="muted">12 small stages. Each one adds a single habit. You unlock the next one only when this one feels easy.</p>

  <section class="card stage-now">
    <p class="eyebrow">Current stage ${cur + 1} of ${STAGES.length}</p>
    <h2>${sp.st.icon} ${esc(sp.st.name)}</h2>
    <p>${esc(sp.st.pitch)}</p>
    <div class="chips">${habitChips(sp.st)}</div>
    <div class="row gap around">
      ${ring(goodPct, { size: 88, label: `${sp.good}/${sp.st.goodDays}`, sub: 'good days' })}
      ${ring(dayPct, { size: 88, label: `${Math.min(sp.daysIn, sp.st.minDays)}/${sp.st.minDays}`, sub: 'days', color: 'var(--violet)' })}
    </div>
    ${sp.questsLeft ? `<p class="hint">🎯 Finish ${sp.questsLeft} quest${sp.questsLeft > 1 ? 's' : ''} on the Today screen to unlock the next stage.</p>` : ''}
    ${sp.eligible ? `
      <div class="ready">
        <h3>🎉 You’re ready for stage ${cur + 2}!</h3>
        <p>Feel solid? Level up. Still feels shaky? Stay a bit longer. There’s no rush, it’s your call.</p>
        <button class="btn block lg" data-action="stage-up">Unlock ${STAGES[cur + 1].icon} ${esc(STAGES[cur + 1].name)}</button>
      </div>` : sp.isLast ? '<p class="ok">🚀 Final stage. Keep the habits running. You’re on autopilot now.</p>'
      : `<p class="hint">Good day = at least 60% of your daily habits (mini versions count).</p>`}
  </section>

  <div class="path">
    <div class="node done"><span class="dot">✓</span><div><b>Stage 0 · Decide</b><small>Signed your contract on ${fmtDate(s.profile.startDate)}</small></div></div>
    ${STAGES.map((st, i) => {
      const state = i < cur ? 'done' : i === cur ? 'current' : 'locked';
      const reveal = i <= cur + 1;
      const hist = s.stage.history.find(h => h.index === i);
      return `<div class="node ${state}">
        <span class="dot">${state === 'done' ? '✓' : state === 'current' ? st.icon : '🔒'}</span>
        <div>
          <b>Stage ${i + 1} · ${reveal ? esc(st.name) : '???'}</b>
          <small>${state === 'done' ? `Unlocked ${fmtDate(hist.start)}` : state === 'current' ? 'You are here' : reveal ? esc(st.pitch) : 'Unlock earlier stages to reveal'}</small>
        </div>
      </div>`;
    }).join('')}
    <div class="node locked finish"><span class="dot">🏁</span><div><b>Goal: ${s.profile.goalWeight} kg</b><small>Target ${fmtDate(plan.targetDate, { month: 'long', year: 'numeric' })}</small></div></div>
  </div>

  <section class="card">
    <h3>📋 Your plan in numbers</h3>
    <p class="muted small">You don’t need to count these. The habits get you there. They’re here if you’re curious.</p>
    <div class="plan-grid">
      <div><b>~${fmtNum(plan.kcal)}</b><small>kcal / day</small></div>
      <div><b>${plan.protein} g</b><small>protein / day</small></div>
      <div><b>${plan.water} L</b><small>water / day</small></div>
      <div><b>${(plan.weekly * 1000).toFixed(0)} g</b><small>loss / week</small></div>
      <div><b>${fmtNum(plan.tdee)}</b><small>kcal you burn</small></div>
      <div><b>−${fmtNum(plan.deficit)}</b><small>daily deficit</small></div>
    </div>
    <h4>✋ Hand-portion guide (no scale needed)</h4>
    <div class="hands">
      <div><span>🖐️</span><b>Protein</b><small>1–2 palms per meal</small></div>
      <div><span>🤲</span><b>Carbs</b><small>1–2 cupped hands</small></div>
      <div><span>✊</span><b>Veggies</b><small>2 fists</small></div>
      <div><span>👍</span><b>Fats</b><small>1–2 thumbs</small></div>
    </div>
  </section>`;
}

on('stage-up', () => {
  const s = getState();
  const sp = stageProgress(s);
  if (!sp.eligible) return;
  const next = STAGES[sp.idx + 1];
  commit(st => {
    st.stage.index = sp.idx + 1;
    st.stage.history.push({ index: sp.idx + 1, start: today() });
  });
  confetti(180);
  toast(`<b>${next.icon} Stage ${sp.idx + 2} unlocked!</b> +100 XP. New habit: ${next.habits.map(id => HABITS[id].title).join(', ')}`, { kind: 'violet', ms: 5000 });
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
