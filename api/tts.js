// ── CVCraft voice proxy ──
// Turns the interviewer's words into a natural-sounding voice (OpenAI text-to-speech).
// Optional: needs OPENAI_API_KEY. Without it, GET reports { available: false } and the
// app keeps using the browser's own voices. Only the interviewer's text is sent here,
// never the candidate's audio.

// Allowed origins (localhost, *cvcraftai*.vercel.app, ALLOWED_HOSTS) live in _limits.js.
import { checkDaily, clientIdFrom, isAllowedOrigin } from './_limits.js';

const hits = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;
function isRateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > MAX_PER_WINDOW;
}

// Daily limits (see _limits.js). One request is one chunk of speech; a call uses 1 to 3 per question.
// Tune in Vercel: TTS_DAILY_PER_USER, TTS_DAILY_PER_IP, TTS_DAILY_TOTAL.
const LIMITS = {
  perUser: parseInt(process.env.TTS_DAILY_PER_USER) || 150,
  perIp: parseInt(process.env.TTS_DAILY_PER_IP) || 400,
  total: parseInt(process.env.TTS_DAILY_TOTAL) || 5000
};

const VOICES = ['coral', 'nova', 'sage', 'shimmer', 'alloy', 'ash', 'onyx', 'echo', 'fable', 'verse', 'ballad'];
const STYLE = 'Speak like a real person on a work video call: relaxed, warm and conversational, with natural pauses and small changes in pace and tone. Never sound like a presenter, a narrator or a robot. Keep it brisk and friendly.';

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const allowed = isAllowedOrigin(origin);

  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'null');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Client-Id');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.OPENAI_API_KEY;

  // Capability check: lets the app know whether to offer the studio voice. Costs nothing.
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ available: !!apiKey });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!allowed) return res.status(403).json({ error: 'Forbidden.' });

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });

  if (apiKey) {
    const day = await checkDaily({ prefix: 'tts', ip, cid: clientIdFrom(req), limits: LIMITS });
    if (!day.ok) return res.status(429).json({ error: 'Daily voice limit reached.' });
  }
  if (!apiKey) return res.status(501).json({ error: 'Studio voice is not set up.' });

  const { text, voice } = req.body || {};
  if (typeof text !== 'string' || !text.trim()) return res.status(400).json({ error: 'Missing "text".' });
  if (text.length > 600) return res.status(400).json({ error: 'Text is too long.' });
  const chosen = VOICES.includes(voice) ? voice : 'coral';

  try {
    const upstream = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice: chosen,
        input: text.trim(),
        instructions: STYLE,
        response_format: 'mp3'
      })
    });
    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}));
      return res.status(502).json({ error: err?.error?.message || 'Voice service error.' });
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buf);
  } catch (err) {
    return res.status(500).json({ error: 'Voice request failed.' });
  }
}
