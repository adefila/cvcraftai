// ── Cost & abuse protection ──
// This endpoint calls the Anthropic API using YOUR key, billed to YOUR account.
// Without these checks, anyone who discovers this URL (visible in any browser's
// network tab) could call it directly, unlimited, on your dime.

// 1. Only allow requests that say they're coming from this app's own pages.
//    Browsers send Origin automatically and JS running on other sites cannot
//    fake it, so this blocks the most common abuse vector (other sites' code
//    calling your endpoint). It does NOT stop a determined attacker using a
//    non-browser tool that forges headers — for that, a persistent store
//    (e.g. Vercel KV / Upstash) and stricter per-IP limits would be needed.
function isAllowedOrigin(origin) {
  if (!origin) return false;
  try {
    const { hostname, protocol } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    return protocol === 'https:' && hostname.endsWith('.vercel.app') && hostname.includes('cvcraftai');
  } catch {
    return false;
  }
}

// 2. Best-effort per-IP rate limit. Serverless containers are short-lived and
//    can spin up fresh at any time, so this resets often and is NOT a hard
//    guarantee — but it stops sustained abuse within a single warm container,
//    at zero cost and zero new services to set up.
const hits = new Map(); // ip -> [timestamps]
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
function isRateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear(); // crude safety valve against unbounded memory growth
  return arr.length > MAX_PER_WINDOW;
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const allowed = isAllowedOrigin(origin);

  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'null');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!allowed) {
    return res.status(403).json({ error: 'Forbidden: request did not originate from an allowed app instance.' });
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY. Add it in Vercel Project Settings -> Environment Variables.' });
  }

  try {
    const { prompt, max_tokens } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing "prompt" string in request body.' });
    }
    if (prompt.length > 8000) {
      return res.status(400).json({ error: 'Prompt is too long.' });
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: Math.min(Math.max(parseInt(max_tokens) || 1200, 1), 1500),
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: data?.error?.message || 'Upstream Anthropic API error.' });
    }

    const text = (data.content || []).map(b => b.text || '').join('');
    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: 'Proxy request failed: ' + (err?.message || 'unknown error') });
  }
}
