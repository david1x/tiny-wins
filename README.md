# Tiny Wins: lazy-proof weight loss (PWA)

A mobile-first, installable web app for people who want to lose weight **without** a big life overhaul.
Diet first, fitness second. One small stage at a time, built on psychology instead of willpower.

No build step, no dependencies. Plain HTML/CSS/JS. Works fully offline with data on the device
(localStorage), and can **optionally** sync across devices through a tiny self-hosted account API.

## Example user it was designed around

34-year-old man · 180 cm · 104.5 kg · desk job · a kid at home + a pregnant partner (= junk food in the house) · wants −15 kg in 12 months · "super lazy".

What the app calculates for him (Mifflin-St Jeor, sedentary):

| | |
|---|---|
| Burns per day (TDEE) | ~2,400 kcal |
| Target | **~2,100 kcal/day** (only a ~316 kcal deficit) |
| Pace | 288 g/week ≈ 1.25 kg/month |
| Protein | ~145 g/day |
| BMI now → goal | 32.3 → 27.6 |

He never has to count any of this. The habits create the deficit.

## The 12 stages (one new habit each)

| # | Stage | New habit(s) | Why it fits him |
|---|---|---|---|
| 1 | Just Start | Water before meals · rate meals (1 tap) · weekly weigh-in | Tiny wins, self-monitoring |
| 2 | Danger Zone Defense | 📦 Family snack box (quest) · 🍎 healthy snacks at eye level (quest) · kitchen closes after dinner | Junk at home + night snacking |
| 3 | Protein Mornings | Protein breakfast | Kills afternoon cravings |
| 4 | Walk It Off | 10-min walk after lunch | Desk job, first movement habit |
| 5 | No Liquid Calories | Zero sugary drinks | Easiest calories to cut |
| 6 | Plate Hack | Half plate veggies | Eats the same family dinner |
| 7 | Desk Escape | 2 desk breaks (guided 2-min timer) | Desk job |
| 8 | Strong Dad | 5-min strength, 3×/week (guided) | Keeps muscle |
| 9 | Slow Down | Serve once, wait 10 min | Portion control |
| 10 | Sleep Shield | In bed by 23:30, phone away | Newborn coming |
| 11 | Step Up | 7,000 steps | More burn |
| 12 | Autopilot | Sunday mini meal-prep | Maintenance |

A stage unlocks only after its minimum days **and** enough "good days" (≥60% of daily habits; mini versions count).
The user chooses whether to level up or stay longer (autonomy).

## Psychology built in

- **Tiny Habits + a mini version** for every habit ("bad day? walk 2 minutes")
- **Implementation intentions**: every habit has an "After X → I do Y" trigger
- **Environment design**: snack box / eye-level quests for the junk-at-home problem
- **Never miss twice**: streak freezes (earn 1 per 7 good days, max 2) + a "never miss twice" banner
- **Craving SOS (urge surfing)**: name the craving → 10-min wave timer with breathing → kind outcome logging → if-then plan for next time
- **Identity-based habits + commitment device**: "I'm becoming…" + press-and-hold contract signing
- **Variable rewards**: XP, 16 levels, 25 badges, random 🍀 lucky bonuses, confetti
- **Goal gradient**: milestones every 2.5 kg, stage progress rings
- **Self-compassion**: honest "I ate it" still earns XP; weight-up messages explain water swings
- **Fresh start effect**: Monday weekly review card
- **Survival mode** for hard weeks (new baby): 1 tiny win = good day

## Run locally

```bash
python -m http.server 5173
```

Open http://localhost:5173 (localhost counts as secure, so the service worker and install work).

## Deploy (Docker)

The app ships as two containers behind nginx (which also serves the static PWA and proxies `/api/`
to the sync API). See **[DEPLOY.md](DEPLOY.md)** for the full operations guide. Quick version:

```bash
docker compose up -d --build
```

App on `http://<host>:8088`. To build and push the images to a registry, then run from them:

```bash
docker compose build && docker compose push && docker compose up -d
```

## Install on Android (Chrome)

Chrome only installs PWAs served over **HTTPS**, so put the container behind TLS — a Cloudflare
Tunnel public hostname pointing at `localhost:8088`, a reverse proxy, or any static host for the
front end. Then on the phone: open the URL in Chrome → **⋮ → Install app** (or tap the in-app
"Install" banner). Long-press the home-screen icon for **Craving SOS** and **Log weight** shortcuts.

> Notifications and install need HTTPS; over plain HTTP (e.g. the LAN IP) the service worker does
> not register, so those are disabled there but the rest of the app works.

## Notifications: how they work, honestly

- Reminders (morning, lunch, danger-zone evening, end-of-day check-in, weekly weigh-in) are scheduled by the **service worker** (`sw.js`).
- While the app is open, it fires them on time.
- While it's closed, it uses **Periodic Background Sync**. Chrome on Android only allows this for **installed** apps, and Chrome decides how often it runs (based on how much you use the app), so closed-app reminders can be late or skipped.
- Rules: never more than one notification at a time, stale ones (>3 h late) are dropped, the check-in is skipped if you already finished your habits, and the weigh-in wins on its day.
- For **exact-time** reminders while the app is closed you need Web Push from a small server (VAPID). `sw.js` already handles the `push` event (`{title, body, url}` payload), so only the sender is missing.

## Sync across devices (accounts)

By default everything is device-local. For the same person on several devices, there's an optional
backend: a **dependency-free Node API** (`server/server.js`) with email + password accounts that stores
one JSON state blob per user. The app and API share one origin — nginx proxies `/api/` to the API
container — so there's no CORS and only one tunnel hostname.

- **Sign in:** Me → *Sync across devices*, or "Sign in to restore" on the welcome screen. Passwords are
  hashed (scrypt); sessions are random bearer tokens stored server-side.
- **How sync works:** the whole state is one object with an `updatedAt` stamp. The client pushes after
  changes (debounced) and pulls on load. On a conflict the two states are **merged** — logged days,
  weigh-ins, cravings, workouts, badges and quests are unioned, and for a given day the better habit
  mark wins — so using two devices never silently wipes progress.
- **Your data stays yours:** it lives only in the `tinywins-data` Docker volume on your box.

### Config (env on the `tiny-wins-api` service)

| Var | Default | Purpose |
|---|---|---|
| `SIGNUP_CODE` | empty | If set, new accounts must supply this invite code. Set it so a public URL can't be used for open sign-ups. |
| `ALLOW_ORIGIN` | empty | CORS allow-list, only needed if you serve the API on a *different* hostname than the app. Same-origin (the default nginx proxy) needs nothing. |

Set an invite code for a deploy:

```bash
TINYWINS_SIGNUP_CODE=your-secret docker compose up -d --build
```

## Files

```
index.html, manifest.webmanifest, sw.js
css/app.css
js/app.js        router, celebrations, install, SW registration
js/store.js      state + localStorage
js/sync.js       accounts + cross-device sync (push/pull + merge)
js/logic.js      plan math, streaks, XP, stages, projection
js/data.js       habits, stages, badges, messages, tips, workouts
js/notify.js     notification permission + reminder sync (IndexedDB)
js/ui.js         sheets, toasts, confetti, rings, timer, charts
js/views/*.js    onboarding, today, sos, journey, progress, me
server/server.js      sync API (dependency-free Node)
server/Dockerfile     API container image
Dockerfile, nginx.conf, docker-compose.yml   deployment (app + API)
DEPLOY.md             operations guide (deploy, registry, backups, invite code)
tools/make-icons.mjs   regenerates icons/ (node tools/make-icons.mjs)
```

When you deploy an update, bump `CACHE` in `sw.js` (e.g. `tinywins-v2`) so phones pick up the new files.

*Not medical advice. Check with a doctor before big diet changes.*
