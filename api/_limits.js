// ── Daily usage limits (shared by api/ai.js and api/tts.js) ──
// Three counters per request: this user (an anonymous id the browser makes up), this
// network address, and the whole site. Each resets at midnight UTC.
//
// Storage: if UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set (a free Upstash
// Redis database, or Vercel's Upstash integration), counts are shared across every server
// instance and survive restarts. Without them, counts live in memory: still useful, but they
// reset when Vercel recycles the function and are not shared between instances.
// The file name starts with an underscore so Vercel does not expose it as a route.

const mem = { day: '', counts: new Map() };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function memBump(keys) {
  const d = today();
  if (mem.day !== d) { mem.day = d; mem.counts = new Map(); }
  if (mem.counts.size > 50000) mem.counts.clear();
  return keys.map(k => {
    const n = (mem.counts.get(k) || 0) + 1;
    mem.counts.set(k, n);
    return n;
  });
}

async function redisBump(keys) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const cmds = [];
    keys.forEach(k => { cmds.push(['INCR', k]); cmds.push(['EXPIRE', k, 90000]); });
    const r = await fetch(`${url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds)
    });
    if (!r.ok) return null;
    const data = await r.json();
    const counts = keys.map((_, i) => Number(data?.[i * 2]?.result));
    return counts.every(Number.isFinite) ? counts : null;
  } catch {
    return null;   // never block a request just because the counter store is down
  }
}

export function clientIdFrom(req) {
  const raw = String(req.headers['x-client-id'] || '');
  return /^[A-Za-z0-9_-]{16,48}$/.test(raw) ? raw : '';
}

// prefix: 'ai' or 'tts'. limits: { perUser, perIp, total }.
// Returns { ok, reason, limit, remaining } where reason is 'user' | 'ip' | 'total' when not ok.
export async function checkDaily({ prefix, ip, cid, limits }) {
  const d = today();
  const user = cid || `ip-${ip}`;
  const keys = [`cv:${prefix}:${d}:u:${user}`, `cv:${prefix}:${d}:ip:${ip}`, `cv:${prefix}:${d}:total`];
  const [u, i, t] = (await redisBump(keys)) || memBump(keys);
  const remaining = Math.max(0, limits.perUser - u);
  if (u > limits.perUser) return { ok: false, reason: 'user', limit: limits.perUser, remaining: 0 };
  if (i > limits.perIp) return { ok: false, reason: 'ip', limit: limits.perUser, remaining: 0 };
  if (t > limits.total) return { ok: false, reason: 'total', limit: limits.perUser, remaining: 0 };
  return { ok: true, limit: limits.perUser, remaining };
}
