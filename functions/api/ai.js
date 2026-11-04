import { checkDaily, clientIdFrom, getIp, isAllowedOrigin, corsHeaders, json } from './_limits.js';

const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
function isRateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > MAX_PER_WINDOW;
}

function limits(env) {
  return {
    perUser: parseInt(env.DAILY_LIMIT_PER_USER) || 120,
    perIp: parseInt(env.DAILY_LIMIT_PER_IP) || 300,
    total: parseInt(env.DAILY_LIMIT_TOTAL) || 4000,
  };
}

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('origin') || '';
  const allowed = isAllowedOrigin(origin, env);
  const cors = corsHeaders(origin, allowed, 'POST, OPTIONS');

  if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);
  if (!allowed) return json({ error: 'Forbidden.' }, 403, cors);

  const ip = getIp(request);
  if (isRateLimited(ip)) return json({ error: 'Too many requests. Please wait a moment and try again.' }, 429, cors);

  const cid = clientIdFrom(request);
  const day = await checkDaily({ prefix: 'ai', ip, cid, limits: limits(env), env });
  const usage = {
    ...cors,
    'X-Daily-Limit': String(day.limit),
    'X-Daily-Remaining': String(day.remaining),
    'Access-Control-Expose-Headers': 'X-Daily-Limit, X-Daily-Remaining',
  };
  if (!day.ok) {
    const msg = day.reason === 'user'
      ? 'You have used your ' + day.limit + ' AI uses for today. They reset tomorrow. Everything else still works.'
      : day.reason === 'ip'
        ? 'Too many AI requests from this network today. Please try again tomorrow.'
        : 'The AI is very busy today. Please try again tomorrow.';
    return json({ error: msg }, 429, usage);
  }

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'Server is missing ANTHROPIC_API_KEY.' }, 500, cors);

  let body = {};
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body.' }, 400, cors); }
  const { prompt, system, messages, max_tokens, temperature, stream: wantStream } = body || {};
  const safeTemp = typeof temperature === 'number' && temperature >= 0 && temperature <= 1 ? temperature : undefined;

  let msgs;
  if (Array.isArray(messages)) {
    if (messages.length < 1 || messages.length > 40) return json({ error: 'Invalid "messages" length.' }, 400, cors);
    let total = 0;
    for (const m of messages) {
      if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string' || !m.content.trim() || m.content.length > 12000) {
        return json({ error: 'Invalid message in "messages".' }, 400, cors);
      }
      total += m.content.length;
    }
    if (total > 30000) return json({ error: 'Conversation is too long.' }, 400, cors);
    if (messages[0].role !== 'user' || messages[messages.length - 1].role !== 'user') {
      return json({ error: '"messages" must start and end with a user message.' }, 400, cors);
    }
    msgs = messages.map(({ role, content }) => ({ role, content }));
  } else {
    if (!prompt || typeof prompt !== 'string') return json({ error: 'Missing "prompt" string.' }, 400, cors);
    if (prompt.length > 8000) return json({ error: 'Prompt is too long.' }, 400, cors);
    msgs = [{ role: 'user', content: prompt }];
  }
  if (system !== undefined && (typeof system !== 'string' || system.length > 9000)) {
    return json({ error: 'Invalid "system" prompt.' }, 400, cors);
  }

  const safeTokens = Math.min(Math.max(parseInt(max_tokens) || 1200, 1), 1500);
  const upstreamBody = (extra) => JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: safeTokens,
    ...(system ? { system } : {}),
    ...(safeTemp !== undefined ? { temperature: safeTemp } : {}),
    messages: msgs,
    ...extra,
  });

  try {
    if (wantStream) {
      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: upstreamBody({ stream: true }),
      });
      if (!upstream.ok) {
        const err = await upstream.json().catch(() => ({}));
        const msg = (err && err.error && err.error.message) || 'Upstream error.';
        return json({ error: msg }, upstream.status, usage);
      }
      let buf = '';
      const enc = new TextEncoder();
      const decoder = new TextDecoder();
      const sse = new TransformStream({
        transform(chunk, controller) {
          buf += decoder.decode(chunk, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop();
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            try {
              const obj = JSON.parse(line.slice(5).trim());
              if (obj.type === 'content_block_delta' && obj.delta && obj.delta.type === 'text_delta') {
                controller.enqueue(enc.encode('data: ' + JSON.stringify({ text: obj.delta.text }) + '\n\n'));
              }
            } catch (_) {}
          }
        },
        flush(controller) {
          buf += decoder.decode();
          for (const line of buf.split('\n')) {
            if (!line.startsWith('data:')) continue;
            try {
              const obj = JSON.parse(line.slice(5).trim());
              if (obj.type === 'content_block_delta' && obj.delta && obj.delta.type === 'text_delta') {
                controller.enqueue(enc.encode('data: ' + JSON.stringify({ text: obj.delta.text }) + '\n\n'));
              }
            } catch (_) {}
          }
        },
      });
      return new Response(upstream.body.pipeThrough(sse), {
        headers: { ...usage, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      });
    }
    const downstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: upstreamBody(),
    });
    const data = await downstream.json().catch(() => ({}));
    if (!downstream.ok) {
      const msg = (data && data.error && data.error.message) || 'Upstream error.';
      return json({ error: msg }, downstream.status, usage);
    }
    const text = ((data && data.content) || []).map((b) => b.text || '').join('');
    return json({ text }, 200, usage);
  } catch (err) {
    return json({ error: 'Proxy request failed: ' + ((err && err.message) || 'unknown') }, 500, cors);
  }
}
