// ── Daily usage limits (shared by functions/api/ai.js, tts.js, feedback.js) ──
// Cloudflare Pages Functions version: uses Web Request/Env, not Node (req, res).
// Same three counters per request (user, network, site), reset at midnight UTC.
// Storage: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN share counts across
// isolates; without them counts live in memory per isolate (reset on redeploy).

export function getCustomHosts(env) {
  const raw = (env && env.ALLOWED_HOSTS) || 'cv.adefilasamuel.com';
  return String(raw).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

export function isAllowedOrigin(origin, env) {
  if (!origin) return false;
  try {
    const { hostname, protocol } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (protocol !== 'https:') return false;
    const lower = hostname.toLowerCase();
    if (getCustomHosts(env).includes(lower)) return true;
    // Any *.pages.dev deployment of this project (prod + previews).
    // Tighten to your exact domain once set: lower === 'cvcraft.pages.dev'
    if (lower.endsWith('.pages.dev') && lower.includes('cvcraft')) return true;
    // Back-compat while Vercel is still live.
    if (lower.endsWith('.vercel.app') && lower.includes('cvcraftai')) return true;
    return false;
  } catch {
    return false;
  }
}

export function getIp(request) {
  const h = request.headers;
  const cf = h.get('cf-connecting-ip');
  if (cf) return cf.split(',')[0].trim();
  const fwd = h.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return 'unknown';
}

const mem = { day: '', counts: new Map() };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function memBump(keys) {
  const d = today();
  if (mem.day !== d) { mem.day = d; mem.counts = new Map(); }
  if (mem.counts.size > 50000) mem.counts.clear();
  return keys.map((k) => {
    const n = (mem.counts.get(k) || 0) + 1;
    mem.counts.set(k, n);
    return n;
  });
}

async function redisBump(keys, env) {
  const url = env && env.UPSTASH_REDIS_REST_URL;
  const token = env && env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const cmds = [];
    keys.forEach((k) => { cmds.push(['INCR', k]); cmds.push(['EXPIRE', k, 90000]); });
    const r = await fetch(String(url).replace(/\/$/, '') + '/pipeline', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const counts = keys.map((_, i) => Number(data && data[i * 2] && data[i * 2].result));
    return counts.every(Number.isFinite) ? counts : null;
  } catch {
    return null;
  }
}

export function clientIdFrom(request) {
  const raw = String(request.headers.get('x-client-id') || '');
  return /^[A-Za-z0-9_-]{16,48}$/.test(raw) ? raw : '';
}

// prefix: 'ai' | 'tts' | 'fb'. limits: { perUser, perIp, total }.
// Returns { ok, reason, limit, remaining } where reason is 'user' | 'ip' | 'total'.
export async function checkDaily({ prefix, ip, cid, limits, env }) {
  const d = today();
  const user = cid || ('ip-' + ip);
  const keys = ['cv:' + prefix + ':' + d + ':u:' + user, 'cv:' + prefix + ':' + d + ':ip:' + ip, 'cv:' + prefix + ':' + d + ':total'];
  const [u, i, t] = (await redisBump(keys, env)) || memBump(keys);
  const remaining = Math.max(0, limits.perUser - u);
  if (u > limits.perUser) return { ok: false, reason: 'user', limit: limits.perUser, remaining: 0 };
  if (i > limits.perIp) return { ok: false, reason: 'ip', limit: limits.perUser, remaining: 0 };
  if (t > limits.total) return { ok: false, reason: 'total', limit: limits.perUser, remaining: 0 };
  return { ok: true, limit: limits.perUser, remaining };
}

export function corsHeaders(origin, allowed, methods) {
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'null',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, X-Client-Id',
  };
}

export function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
  });
}
