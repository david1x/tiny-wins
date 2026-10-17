// Tiny Wins sync API — dependency-free Node. Accounts + one JSON state blob per user.
// Storage is flat files under DATA_DIR, written atomically and serialized through a queue.
'use strict';
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const PORT = +(process.env.PORT || 3000);
const DATA = process.env.DATA_DIR || '/data';
const SIGNUP_CODE = process.env.SIGNUP_CODE || ''; // if set, required to register
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || ''; // CORS for a separate API host / local dev
const SESSION_TTL_DAYS = 180;
const MAX_STATE_BYTES = 2 * 1024 * 1024;

const STATE_DIR = path.join(DATA, 'state');
fs.mkdirSync(STATE_DIR, { recursive: true });
const USERS_FILE = path.join(DATA, 'users.json');
const SESS_FILE = path.join(DATA, 'sessions.json');

/* ---------- atomic JSON store with a write queue ---------- */
const readJSON = (f, fallback) => {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fallback; }
};
let chain = Promise.resolve();
const writeJSON = (f, obj) => {
  chain = chain.then(() => new Promise((res, rej) => {
    const tmp = `${f}.${process.pid}.${Date.now()}.tmp`;
    try {
      fs.writeFileSync(tmp, JSON.stringify(obj));
      fs.renameSync(tmp, f);
      res();
    } catch (e) { try { fs.unlinkSync(tmp); } catch {} rej(e); }
  }));
  return chain;
};

/* ---------- crypto helpers ---------- */
const hashPw = (pw, salt = crypto.randomBytes(16).toString('hex')) =>
  ({ salt, hash: crypto.scryptSync(pw, salt, 64).toString('hex') });
const verifyPw = (pw, salt, hash) => {
  const h = crypto.scryptSync(pw, salt, 64);
  const stored = Buffer.from(hash, 'hex');
  return h.length === stored.length && crypto.timingSafeEqual(h, stored);
};
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const newId = () => crypto.randomBytes(9).toString('base64url');

/* ---------- sessions ---------- */
const TTL = SESSION_TTL_DAYS * 864e5;
function userForToken(token) {
  if (!token) return null;
  const sessions = readJSON(SESS_FILE, {});
  const s = sessions[sha(token)];
  if (!s) return null;
  if (Date.now() - s.createdAt > TTL) return null;
  const users = readJSON(USERS_FILE, {});
  return Object.values(users).find(u => u.id === s.userId) || null;
}
async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const sessions = readJSON(SESS_FILE, {});
  // prune expired while we're here
  for (const [k, v] of Object.entries(sessions)) if (Date.now() - v.createdAt > TTL) delete sessions[k];
  sessions[sha(token)] = { userId, createdAt: Date.now() };
  await writeJSON(SESS_FILE, sessions);
  return token;
}

/* ---------- naive login throttle (per IP) ---------- */
const fails = new Map();
function throttled(ip) {
  const rec = fails.get(ip);
  if (!rec) return false;
  if (Date.now() - rec.first > 15 * 60e3) { fails.delete(ip); return false; }
  return rec.n >= 10;
}
const noteFail = ip => {
  const rec = fails.get(ip) || { n: 0, first: Date.now() };
  rec.n++; fails.set(ip, rec);
};

/* ---------- http plumbing ---------- */
const corsHeaders = origin => {
  if (!ALLOW_ORIGIN) return {};
  const allowed = ALLOW_ORIGIN === '*' || ALLOW_ORIGIN.split(',').map(s => s.trim()).includes(origin);
  if (!allowed) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
};
const send = (res, code, obj) => {
  const body = obj === undefined ? '' : JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...(res._cors || {}) });
  res.end(body);
};
const readBody = req => new Promise((resolve, reject) => {
  let data = '', over = false;
  req.on('data', c => {
    data += c;
    if (data.length > MAX_STATE_BYTES + 4096 && !over) { over = true; reject(new Error('too large')); req.destroy(); }
  });
  req.on('end', () => { if (over) return; try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('bad json')); } });
  req.on('error', reject);
});
const validEmail = e => typeof e === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length <= 160;

const server = http.createServer(async (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '?';
  const url = new URL(req.url, 'http://x');
  const route = `${req.method} ${url.pathname}`;
  const auth = () => userForToken((req.headers.authorization || '').replace(/^Bearer /, ''));
  res._cors = corsHeaders(req.headers.origin);

  try {
    if (req.method === 'OPTIONS') return send(res, 204);
    if (route === 'GET /api/health') return send(res, 200, { ok: true });

    if (route === 'POST /api/register') {
      const { email, password, code } = await readBody(req);
      if (SIGNUP_CODE && code !== SIGNUP_CODE) return send(res, 403, { error: 'This server needs an invite code to sign up.' });
      if (!validEmail(email)) return send(res, 400, { error: 'Enter a valid email.' });
      if (typeof password !== 'string' || password.length < 8) return send(res, 400, { error: 'Password must be at least 8 characters.' });
      const key = email.toLowerCase();
      const users = readJSON(USERS_FILE, {});
      if (users[key]) return send(res, 409, { error: 'That email already has an account. Try signing in.' });
      const { salt, hash } = hashPw(password);
      users[key] = { id: newId(), email, salt, hash, createdAt: Date.now() };
      await writeJSON(USERS_FILE, users);
      const token = await createSession(users[key].id);
      return send(res, 201, { token, email });
    }

    if (route === 'POST /api/login') {
      if (throttled(ip)) return send(res, 429, { error: 'Too many attempts. Wait 15 minutes and try again.' });
      const { email, password } = await readBody(req);
      const users = readJSON(USERS_FILE, {});
      const u = validEmail(email) ? users[email.toLowerCase()] : null;
      if (!u || !verifyPw(String(password || ''), u.salt, u.hash)) {
        noteFail(ip);
        return send(res, 401, { error: 'Wrong email or password.' });
      }
      fails.delete(ip);
      const token = await createSession(u.id);
      return send(res, 200, { token, email: u.email });
    }

    // everything below needs a valid session
    const user = auth();
    if (route === 'POST /api/logout') {
      if (user) {
        const token = (req.headers.authorization || '').replace(/^Bearer /, '');
        const sessions = readJSON(SESS_FILE, {});
        delete sessions[sha(token)];
        await writeJSON(SESS_FILE, sessions);
      }
      return send(res, 200, { ok: true });
    }
    if (!user) return send(res, 401, { error: 'Please sign in again.' });

    if (route === 'GET /api/state') {
      const st = readJSON(path.join(STATE_DIR, `${user.id}.json`), null);
      return send(res, 200, st || { updatedAt: 0, data: null });
    }

    if (route === 'PUT /api/state') {
      const body = await readBody(req);
      const incoming = +body.updatedAt || 0;
      if (!body.data || typeof body.data !== 'object') return send(res, 400, { error: 'Missing data.' });
      const file = path.join(STATE_DIR, `${user.id}.json`);
      const cur = readJSON(file, { updatedAt: 0, data: null });
      // Last-write-wins: reject stale writes so the client can merge and retry.
      if (incoming < cur.updatedAt) return send(res, 409, cur);
      const rec = { updatedAt: incoming || Date.now(), data: body.data };
      await writeJSON(file, rec);
      return send(res, 200, { updatedAt: rec.updatedAt });
    }

    return send(res, 404, { error: 'Not found' });
  } catch (e) {
    const msg = e.message === 'too large' ? 'Payload too large.' : e.message === 'bad json' ? 'Invalid JSON.' : 'Server error.';
    return send(res, e.message === 'too large' ? 413 : 400, { error: msg });
  }
});

server.listen(PORT, () => console.log(`tiny-wins api on :${PORT}, data=${DATA}${SIGNUP_CODE ? ', signup code required' : ''}`));
