# Deploying Tiny Wins

How the app runs in production and how to operate it. This reflects the live setup on the
`devops` host (`/devops/tiny-wins`, served on port **8088**, images in a private registry).

## Architecture

Two containers, defined in [`docker-compose.yml`](docker-compose.yml):

```
                      ┌──────────────── tiny-wins (nginx) ────────────────┐
  browser ──8088──►   │  serves the static PWA (/, /js, /css, /icons …)   │
                      │  proxies /api/  ──────────────►  tiny-wins-api     │
                      └───────────────────────────────────────────────────┘
                                                         (internal only, :3000)
                                                         data → volume tinywins-data
```

- **`tiny-wins`** — nginx serving the static app and reverse-proxying `/api/` to the API. The only
  container published to the host (`8088:80`). Image: `registry.amarsphere.com/tiny-wins`.
- **`tiny-wins-api`** — the dependency-free Node sync API ([`server/server.js`](server/server.js)).
  **Not** published to the host; reachable only through nginx on the compose network. Image:
  `registry.amarsphere.com/tiny-wins-api`. Its data lives in the named volume **`tinywins-data`**.

App and API share one origin (nginx proxy), so there is no CORS and only **one** hostname/tunnel
is needed.

## First deploy

```bash
git clone https://github.com/david1x/tiny-wins.git
cd tiny-wins
# optional: require an invite code for new accounts (see "Accounts" below)
echo 'TINYWINS_SIGNUP_CODE=your-secret' > .env && chmod 600 .env
docker compose up -d --build
```

Verify:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8088/            # 200
curl -s http://localhost:8088/api/health                                   # {"ok":true}
docker compose ps                                                          # both healthy
```

## Redeploy after a change

```bash
cd /devops/tiny-wins
git pull
docker compose build
docker compose push          # push images to registry.amarsphere.com (optional but matches our flow)
docker compose up -d
```

App JS/CSS are served `no-cache` (revalidated every load), so a normal browser refresh picks up a
new deploy. When you change files that the **service worker** precaches, bump `CACHE` in
[`sw.js`](sw.js) (e.g. `tinywins-vN` → `vN+1`) so installed PWAs fetch the new files; the install
step uses `cache:'reload'` to avoid re-caching stale copies.

## Registry

Images are tagged `registry.amarsphere.com/tiny-wins[-api]:latest` in `docker-compose.yml`, matching
the other apps on the host. The host is already logged in (`~/.docker/config.json`), so
`docker compose push` works. Another machine can then run the app with just the compose file and
`docker compose pull && docker compose up -d` (no build).

## Accounts & the invite code

New-account signup is gated by `SIGNUP_CODE` on the `tiny-wins-api` service, wired from the host via
`TINYWINS_SIGNUP_CODE` in `.env` (gitignored, never committed):

| State | Behaviour |
|---|---|
| `.env` absent / empty | **Open signup** — anyone who can reach the URL can register. |
| `TINYWINS_SIGNUP_CODE=…` set | New accounts must enter that code; registering without it returns 403. |

Set or change it:

```bash
echo 'TINYWINS_SIGNUP_CODE=new-secret' > /devops/tiny-wins/.env
docker compose up -d        # recreates the api container with the new value
```

Users enter the code once per device on the **Create account** screen. Always set a code before
exposing the app publicly (e.g. through the tunnel).

## Data & backups

All account data is JSON files in the `tinywins-data` volume (`users.json`, `sessions.json`,
`state/<userId>.json`). There is no automatic backup. Back it up with:

```bash
docker run --rm -v tiny-wins_tinywins-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/tinywins-data-$(date +%F).tar.gz -C /data .
```

> ⚠️ Do **not** `rm` files in the volume to "clean up" — that deletes real user accounts and their
> synced state (the device copies survive, but the server mirror is lost). Delete a single user only
> on request, by removing their entry from `users.json` and `state/<id>.json`.

Restore:

```bash
docker run --rm -v tiny-wins_tinywins-data:/data -v "$PWD":/backup alpine \
  sh -c 'cd /data && tar xzf /backup/<file>.tar.gz'
docker compose restart tiny-wins-api
```

## HTTPS (install + notifications)

The container serves plain HTTP; the PWA install prompt and push notifications need HTTPS. Put it
behind TLS without changing anything on the box:

- **Cloudflare Tunnel (dashboard-managed):** Zero Trust → Networks → Tunnels → your tunnel →
  **Public Hostname** → add `tinywins.<domain>` → **Service: HTTP → `localhost:8088`**. Cloudflare
  issues the cert and DNS. Service type stays HTTP (TLS terminates at Cloudflare's edge).
- Or any reverse proxy terminating TLS and forwarding to `localhost:8088`.

## Sync model (how conflicts are handled)

State is one JSON object with an `updatedAt` stamp. The client pushes after changes (debounced) and
pulls on load/sign-in. On a conflicting write the server returns the newer copy and the client
**merges**: logged days, weigh-ins, cravings, workouts, badges and quests are unioned (and for a
given day the better habit mark wins), then the merged result is pushed back. So two devices never
silently overwrite each other. Details in [`js/sync.js`](js/sync.js) (`mergeStates`).

## Ports

Host **8088** → app. The API is internal only. If 8088 clashes, change the left side of the port
mapping in `docker-compose.yml` and redeploy.
