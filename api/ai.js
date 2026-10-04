// ── CVCraft AI Proxy ──
// Handles both streaming (SSE) and non-streaming requests to Anthropic.
// Security: origin-checked + per-IP rate limit (best-effort, in-memory).

// Allowed origins (localhost, *cvcraftai*.vercel.app, ALLOWED_HOSTS) live in _limits.js.
import { checkDaily, clientIdFrom, isAllowedOrigin } from './_limits.js';

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

// Daily limits (see _limits.js). A full interview is roughly 15 to 40 requests.
// Tune in Vercel: DAILY_LIMIT_PER_USER, DAILY_LIMIT_PER_IP (shared networks), DAILY_LIMIT_TOTAL.
const LIMITS = {
  perUser: parseInt(process.env.DAILY_LIMIT_PER_USER) || 120,
  perIp: parseInt(process.env.DAILY_LIMIT_PER_IP) || 300,
  total: parseInt(process.env.DAILY_LIMIT_TOTAL) || 4000
};

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const allowed = isAllowedOrigin(origin);

  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'null');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Client-Id');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!allowed) return res.status(403).json({ error: 'Forbidden.' });

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });

  const day = await checkDaily({ prefix: 'ai', ip, cid: clientIdFrom(req), limits: LIMITS });
  res.setHeader('X-Daily-Limit', String(day.limit));
  res.setHeader('X-Daily-Remaining', String(day.remaining));
  res.setHeader('Access-Control-Expose-Headers', 'X-Daily-Limit, X-Daily-Remaining');
  if (!day.ok) {
    const msg = day.reason === 'user'
      ? `You have used your ${day.limit} AI uses for today. They reset tomorrow. Everything else still works.`
      : day.reason === 'ip'
        ? 'Too many AI requests from this network today. Please try again tomorrow.'
        : 'The AI is very busy today. Please try again tomorrow.';
    return res.status(429).json({ error: msg });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY. Add it in Vercel Project Settings → Environment Variables.' });

  const { prompt, system, messages, max_tokens, stream: wantStream } = req.body || {};

  // Two input shapes: a single "prompt" string (most features), or a multi-turn
  // "messages" array (the mock interview). Both are length-capped; the caller
  // can't pick the model, so this stays a bounded proxy.
  let msgs;
  if (Array.isArray(messages)) {
    if (messages.length < 1 || messages.length > 40) return res.status(400).json({ error: 'Invalid "messages" length.' });
    let total = 0;
    for (const m of messages) {
      if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string' || !m.content.trim() || m.content.length > 12000) {
        return res.status(400).json({ error: 'Invalid message in "messages".' });
      }
      total += m.content.length;
    }
    if (total > 30000) return res.status(400).json({ error: 'Conversation is too long.' });
    if (messages[0].role !== 'user' || messages[messages.length - 1].role !== 'user') {
      return res.status(400).json({ error: '"messages" must start and end with a user message.' });
    }
    msgs = messages.map(({ role, content }) => ({ role, content }));
  } else {
    if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Missing "prompt" string.' });
    if (prompt.length > 8000) return res.status(400).json({ error: 'Prompt is too long.' });
    msgs = [{ role: 'user', content: prompt }];
  }
  if (system !== undefined && (typeof system !== 'string' || system.length > 9000)) {
    return res.status(400).json({ error: 'Invalid "system" prompt.' });
  }

  const safeTokens = Math.min(Math.max(parseInt(max_tokens) || 1200, 1), 1500);
  const upstreamBody = (extra = {}) => JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: safeTokens,
    ...(system ? { system } : {}),
    messages: msgs,
    ...extra
  });

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
        body: upstreamBody({ stream: true })
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
        body: upstreamBody()
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
