// ── CVCraft feedback ──
// Emails a visitor's feedback to the site owner (through Resend). Needs RESEND_API_KEY.
//   FEEDBACK_TO    where it is delivered. Default samuel@adefilasamuel.com. Until you verify
//                  a domain in Resend, this must be the email you signed up to Resend with.
//   FEEDBACK_FROM  sender shown on the email. Default "CVCraft Feedback <onboarding@resend.dev>".
// Only the message, its type and an optional reply address are sent. Nothing from the CV.

import { checkDaily, clientIdFrom, isAllowedOrigin } from './_limits.js';

const TYPES = ['Something broke', 'Confusing', 'An idea', 'Something I liked'];
const LIMITS = { perUser: 5, perIp: 30, total: 300 };

export default async function handler(req, res) {
  const origin = req.headers.origin;
  const allowed = isAllowedOrigin(origin);

  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : 'null');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Client-Id');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!allowed) return res.status(403).json({ error: 'Forbidden.' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(501).json({ error: 'Feedback is not set up yet.' });

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const day = await checkDaily({ prefix: 'fb', ip, cid: clientIdFrom(req), limits: LIMITS });
  if (!day.ok) return res.status(429).json({ error: 'You have sent a lot of feedback today. Thank you! Please try again tomorrow.' });

  const { type, message, email } = req.body || {};
  const text = typeof message === 'string' ? message.trim() : '';
  if (text.length < 5) return res.status(400).json({ error: 'Please write a few words.' });
  if (text.length > 1500) return res.status(400).json({ error: 'That message is too long.' });
  const kind = TYPES.includes(type) ? type : 'Feedback';
  const reply = typeof email === 'string' && /^[^\s@<>"]{1,64}@[^\s@<>"]{1,200}\.[^\s@<>"]{2,}$/.test(email.trim()) && email.trim().length <= 254
    ? email.trim() : '';

  try {
    const upstream = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.FEEDBACK_FROM || 'CVCraft Feedback <onboarding@resend.dev>',
        to: [process.env.FEEDBACK_TO || 'samuel@adefilasamuel.com'],
        subject: `CVCraft feedback: ${kind}`,
        text: `${text}\n\n---\nType: ${kind}\nReply to: ${reply || '(not given)'}\nSent from: ${origin || 'unknown'}\nAt: ${new Date().toISOString()}`,
        ...(reply ? { reply_to: reply } : {})
      })
    });
    if (!upstream.ok) return res.status(502).json({ error: 'Could not send your message. Please try again later.' });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: 'Could not send your message. Please try again later.' });
  }
}
