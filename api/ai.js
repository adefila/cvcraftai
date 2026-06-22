// ── CVCraft AI Proxy ──
// Handles both streaming (SSE) and non-streaming requests to Anthropic.
// Security: origin-checked + per-IP rate limit (best-effort, in-memory).

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

const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
function isRateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > MAX_PER_WINDOW;
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const allowed = isAllowedOrigin(origin);

  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'null');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!allowed) return res.status(403).json({ error: 'Forbidden.' });

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY. Add it in Vercel Project Settings → Environment Variables.' });

  const { prompt, max_tokens, stream: wantStream } = req.body || {};
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Missing "prompt" string.' });
  if (prompt.length > 8000) return res.status(400).json({ error: 'Prompt is too long.' });

  const safeTokens = Math.min(Math.max(parseInt(max_tokens) || 1200, 1), 1500);

  try {
    if (wantStream) {
      // ── STREAMING PATH ──
      // Proxies Anthropic's SSE stream straight to the browser.
      // The browser reads it with callAIStream() using ReadableStream.
      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: safeTokens,
          stream: true,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!upstream.ok) {
        const err = await upstream.json().catch(() => ({}));
        return res.status(upstream.status).json({ error: err?.error?.message || 'Upstream error.' });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Re-emit only the text delta events in a simplified format
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') { res.write('data: [DONE]\n\n'); continue; }
          try {
            const obj = JSON.parse(payload);
            // Anthropic streaming: content_block_delta with text delta
            if (obj.type === 'content_block_delta' && obj.delta?.type === 'text_delta') {
              res.write(`data: ${JSON.stringify({ text: obj.delta.text })}\n\n`);
            }
          } catch (_) {}
        }
      }
      res.end();
    } else {
      // ── NON-STREAMING PATH ── (unchanged, used for structured output parsing)
      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: safeTokens,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await upstream.json();
      if (!upstream.ok) return res.status(upstream.status).json({ error: data?.error?.message || 'Upstream error.' });

      const text = (data.content || []).map(b => b.text || '').join('');
      return res.status(200).json({ text });
    }
  } catch (err) {
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Proxy request failed: ' + (err?.message || 'unknown') });
    }
    res.end();
  }
}
