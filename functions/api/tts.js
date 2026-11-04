// ── CVCraft voice proxy (Cloudflare Pages Function) ──
// Turns the interviewer's text into speech (OpenAI TTS). GET reports { available }.
import { checkDaily, clientIdFrom, getIp, isAllowedOrigin, corsHeaders, json } from './_limits.js';

const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;
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
    perUser: parseInt(env.TTS_DAILY_PER_USER) || 150,
    perIp: parseInt(env.TTS_DAILY_PER_IP) || 400,
    total: parseInt(env.TTS_DAILY_TOTAL) || 5000,
  };
}

const VOICES = ['coral', 'nova', 'sage', 'shimmer', 'alloy', 'ash', 'onyx', 'echo', 'fable', 'verse', 'ballad'];
const STYLE = 'Speak like a real person on a work video call: relaxed, warm and conversational, with natural pauses and small changes in pace and tone. Never sound like a presenter, a narrator or a robot. Keep it brisk and friendly.';

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('origin') || '';
  const allowed = isAllowedOrigin(origin, env);
  const cors = corsHeaders(origin, allowed, 'GET, POST, OPTIONS');

  if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors });

  const apiKey = env.OPENAI_API_KEY;

  if (request.method === 'GET') {
    return json({ available: !!apiKey }, 200, { ...cors, 'Cache-Control': 'no-store' });
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);
  if (!allowed) return json({ error: 'Forbidden.' }, 403, cors);

  const ip = getIp(request);
  if (isRateLimited(ip)) return json({ error: 'Too many requests. Please wait a moment.' }, 429, cors);

  if (apiKey) {
    const cid = clientIdFrom(request);
    const day = await checkDaily({ prefix: 'tts', ip, cid, limits: limits(env), env });
    if (!day.ok) return json({ error: 'Daily voice limit reached.' }, 429, cors);
  }
  if (!apiKey) return json({ error: 'Studio voice is not set up.' }, 501, cors);

  let body = {};
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body.' }, 400, cors); }
  const { text, voice } = body || {};
  if (typeof text !== 'string' || !text.trim()) return json({ error: 'Missing "text".' }, 400, cors);
  if (text.length > 600) return json({ error: 'Text is too long.' }, 400, cors);
  const chosen = VOICES.includes(voice) ? voice : 'coral';

  try {
    const upstream = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice: chosen,
        input: text.trim(),
        instructions: STYLE,
        response_format: 'mp3',
      }),
    });
    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      const msg = (err && err.error && err.error.message) || 'Voice service error.';
      return json({ error: msg }, 502, cors);
    }
    return new Response(await upstream.arrayBuffer(), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    });
  } catch {
    return json({ error: 'Voice request failed.' }, 500, cors);
  }
}
