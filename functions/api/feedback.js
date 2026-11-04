// ── CVCraft feedback (Cloudflare Pages Function) ──
// Emails a visitor's feedback to the site owner (through Resend). Needs RESEND_API_KEY.
//   FEEDBACK_TO    where it is delivered. Default samuel@adefilasamuel.com.
//   FEEDBACK_FROM  sender shown on the email. Default "CVCraft Feedback <onboarding@resend.dev>".
// Only the message, its type and an optional reply address are sent. Nothing from the CV.
import { checkDaily, clientIdFrom, getIp, isAllowedOrigin, corsHeaders, json } from './_limits.js';

const TYPES = ['Something broke', 'Confusing', 'An idea', 'Something I liked'];
const LIMITS = { perUser: 5, perIp: 30, total: 300 };

export async function onRequest(context) {
  const { request, env } = context;
  const origin = request.headers.get('origin') || '';
  const allowed = isAllowedOrigin(origin, env);
  const cors = corsHeaders(origin, allowed, 'POST, OPTIONS');

  if (request.method === 'OPTIONS') return new Response(null, { status: 200, headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);
  if (!allowed) return json({ error: 'Forbidden.' }, 403, cors);

  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return json({ error: 'Feedback is not set up yet.' }, 501, cors);

  const ip = getIp(request);
  const cid = clientIdFrom(request);
  const day = await checkDaily({ prefix: 'fb', ip, cid, limits: LIMITS, env });
  if (!day.ok) return json({ error: 'You have sent a lot of feedback today. Thank you! Please try again tomorrow.' }, 429, cors);

  let body = {};
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body.' }, 400, cors); }
  const { type, message, email } = body || {};
  const text = typeof message === 'string' ? message.trim() : '';
  if (text.length < 5) return json({ error: 'Please write a few words.' }, 400, cors);
  if (text.length > 1500) return json({ error: 'That message is too long.' }, 400, cors);
  const kind = TYPES.includes(type) ? type : 'Feedback';
  const reply = typeof email === 'string' && /^[^\s@<>"]{1,64}@[^\s@<>"]{1,200}\.[^\s@<>"]{2,}$/.test(email.trim()) && email.trim().length <= 254
    ? email.trim() : '';

  try {
    const upstream = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.FEEDBACK_FROM || 'CVCraft Feedback <onboarding@resend.dev>',
        to: [env.FEEDBACK_TO || 'samuel@adefilasamuel.com'],
        subject: 'CVCraft feedback: ' + kind,
        text: text + '\n\n---\nType: ' + kind + '\nReply to: ' + (reply || '(not given)') + '\nSent from: ' + (origin || 'unknown') + '\nAt: ' + new Date().toISOString(),
        ...(reply ? { reply_to: reply } : {}),
      }),
    });
    if (!upstream.ok) return json({ error: 'Could not send your message. Please try again later.' }, 502, cors);
    return json({ ok: true }, 200, cors);
  } catch {
    return json({ error: 'Could not send your message. Please try again later.' }, 500, cors);
  }
}
