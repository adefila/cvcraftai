# CVCraft AI — ATS-Optimized CV Builder

A CV builder with 33 templates, live ATS and recruiter scoring, job-description keyword matching, and Claude-powered writing help. One static page plus one small serverless function — no framework, no build step, no database. Everything you type stays in your browser.

Live: https://cvcraftai.vercel.app

---

## Setup (required for the AI features)

The AI features call Anthropic through a serverless proxy (`api/ai.js`) so the API key never reaches the browser.

1. In Vercel: **Project → Settings → Environment Variables**
2. Add `ANTHROPIC_API_KEY` with your key from [console.anthropic.com](https://console.anthropic.com)
3. Redeploy

Without the key, AI features show a clear error. Everything else — templates, scoring, JD matching, exports, saved versions — works with no key.

**Proxy limits** (`api/ai.js`)
- Only accepts requests from `localhost`, `127.0.0.1`, an `https://*.vercel.app` host containing `cvcraftai`, or the custom hosts listed in the `ALLOWED_HOSTS` environment variable (comma-separated, default `cv.adefilasamuel.com`). **Any other domain gets `403 Forbidden`.** Applies to `api/ai.js` and `api/tts.js`.
- 20 requests per minute per IP (in-memory, best effort) and responses capped at 1,500 tokens.
- **Daily limits per user** (`api/_limits.js`, shared by both endpoints). Each browser makes up an anonymous id (`X-Client-Id`, stored as `cvcraftai-cid`; no accounts, nothing personal) and gets its own allowance. There are also caps per network address and for the whole site. Defaults for `api/ai.js`: `DAILY_LIMIT_PER_USER` 120, `DAILY_LIMIT_PER_IP` 300, `DAILY_LIMIT_TOTAL` 4000; for `api/tts.js`: `TTS_DAILY_PER_USER` 150, `TTS_DAILY_PER_IP` 400, `TTS_DAILY_TOTAL` 5000. A full interview uses about 20 AI requests. The server reports `X-Daily-Remaining` / `X-Daily-Limit`, and the app shows people how many uses they have left (warnings at 20, 10 and 3, plus the "Your data" note). Over the limit returns a friendly 429.
  - **Where counts live:** set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (a free Upstash Redis database, or Vercel's Upstash integration) and counts are shared across all servers and survive restarts. Without them counts are kept in memory, which is best effort: they reset when Vercel recycles the function.
  - **Honest limit:** the id lives in the browser, so someone who clears their storage gets a fresh allowance. The per-network and site-wide caps and a spending limit in the Anthropic / OpenAI consoles are the backstop.
- Two request shapes: `{ prompt }` (up to 8,000 characters) or `{ system, messages }` for multi-turn use (`system` up to 9,000 characters; up to 40 messages of at most 12,000 characters each and 30,000 in total, roles `user`/`assistant`, starting and ending with `user`). Add `stream: true` for server-sent events. The model is fixed server-side.

## Features

**Building**
- 33 templates in six categories: Minimal (7), Modern (6), Executive (4), Creative (4), Technical (6), Bold (6)
- 8 accent colours that apply to every template
- Experience, education, projects, certifications, languages, social links, work authorisation
- **Start screen** for an empty CV with three paths: build it with AI, import a current CV (PDF, Word `.docx`, text file or pasted text; the Word file is read in the browser with no extra library), or start from a blank form. A blank CV shows neutral dashes instead of a red score.
- **Target job chip** in the preview header shows which job post the CV is aimed at (it feeds JD Match, the cover letter and the interview) and jumps to the JD tab. The JD tab explains what it gives you and offers a sample job post.
- **Quick template switcher** in the preview header; the Templates tab still has the full gallery.
- **Collapsible Build sections** (with "Collapse all"), a next-step strip that stays in view, and persistent field labels.
- **Phones and tablets:** a floating "Preview CV / Edit CV" button jumps between the form and the CV.
- **Dark theme (beta)**, opt-in from the "..." menu and remembered. The CV preview and every export stay white and always render in the light theme.
- **Accessibility:** tabs use proper roles and arrow keys, dialogs trap focus, close with Esc and return focus, status is never colour-only, and small text is kept at 12px or more.
- Autosave to the browser, plus backup/restore as a JSON file
- **CV versions** — save named copies (e.g. "Google — Product Manager") and switch between them in one click
- Live page-length indicator (1 page / ≈1.4 pages / long)
- Works on phone, tablet and desktop (the editor stacks above the preview below 1024px). The desktop layout is capped at 1180px wide and centred; see [DESIGN.md](DESIGN.md) for the design system

**Scoring and tailoring**
- Live ATS score and recruiter score, with an interview-likelihood read-out
- Weak-word scanner for recruiter-flagged clichés (no AI call)
- JD Match: keyword coverage, missing keywords you can add in one click
- AI: Polish Check, JD gap analysis, "Write with AI" for summaries and bullets, recruiter simulation
- **Cover letter** — drafted from your CV and the pasted job description, using only facts already in your CV
- **Mock interview** — an AI interviewer that has read your CV and the job description. Pick the interviewer (recruiter screen, hiring manager, technical lead, tough panel) and length (5 or 8 questions). It asks one question at a time, mixes opening, project, gap-in-your-CV, behavioural and situational questions, follows up once when an answer is thin, and ends with a scorecard: score out of 100, strengths, what to work on, and a stronger version of each answer built only from facts in your CV. The interview runs against a clock (about 10 minutes for 5 questions, 20 for 8). When time is up, whatever you were saying still counts and you get your feedback.
  - **Text chat** is a normal chat.
  - **Voice call** is a video-call style room: a lobby (camera and mic preview, voice picker), a short join countdown, the interviewer's tile, your own tile, live captions, a "time left" timer, and call controls (mic, camera, captions, chat, repeat, leave). Your spoken answer is transcribed live and sends when you pause, or you can type in the chat panel at any time. The camera is optional and its video never leaves your device.
  - Voice uses the browser's built-in speech tools (Edge, Chrome, Safari) and falls back to text where they're unavailable. How human the interviewer sounds depends on the voices your browser has: "Natural" or "Neural" voices (Edge, recent Windows and macOS) sound far better than the older built-in ones, and the voice picker ranks the best available first. A truly human-sounding voice would need a paid speech service.
    - **Saved interviews** — every scored interview is kept in the browser (`cvcraftai-interviews-v1`, newest 20) with a progress line, a "Past interviews" list on the setup screen, and Open / Copy / Download (full transcript as .txt) / Delete. Cleared by "Start over". Nothing leaves the device.
  - **Score accuracy** — it is the AI's opinion of the transcript, so the headline is a likely range (score ±5), scoring runs at low randomness (`temperature` 0.2, an optional parameter accepted by `api/ai.js`), and the screen says it can't judge voice or delivery. Compare practices by the trend, not a single number.
- **Suggestions** — in a voice call, a card appears on the call screen for each question with short talking points and a draft answer built only from your CV (the lobby has a "Show answer suggestions during the call" switch; the lightbulb hides or shows the card). In text mode, the Hint button adds the same thing to the chat. Nothing goes into your answer until you press "Use as my answer", and you can edit it. The scorer is told when a suggestion was used. Live suggestions cost one extra AI call per question.
  - **Spoken answers are cleaned up** before they go in: misheard words, punctuation and "um/uh" are fixed, with no new facts added.
  - **Studio voice (optional)** — set `OPENAI_API_KEY` in Vercel to give interviewers a natural voice through `api/tts.js` (model `gpt-4o-mini-tts`). Only the interviewer's words are sent. Without the key the app keeps using browser voices.
- **Build my CV with AI** — for people who can't write a CV: they describe themselves in plain words (typed or spoken) and AI drafts the whole CV. It only uses what they say, saves the old CV as a version first, and lists what to double-check. Found on the Build tab and the "..." menu.
- **Early-version notice and feedback** — a "Beta" pill by the logo explains the limits in plain words. "Send feedback" (in the "..." menu) posts the message (type, text, optional reply email) to `api/feedback.js`, which emails it to you through [Resend](https://resend.com). It never opens the visitor's email app and sends nothing from the CV. Setup: create a Resend account, add `RESEND_API_KEY` in Vercel, and optionally `FEEDBACK_TO` (default `samuel@adefilasamuel.com`; until you verify a domain in Resend this must be the email you signed up with) and `FEEDBACK_FROM`. Without the key the form says feedback isn't switched on yet. Limit: 5 messages a day per person.
- **Your data** note in the "..." menu explains in plain words what stays in the browser and what is sent to AI services
- **Privacy choice** — a first-visit banner (Accept / No thanks). CVCraft sets no cookies. Accept allows AI requests and loads Vercel Analytics. No thanks keeps analytics off and asks before the first AI request of each visit. With Accept, anonymous feature counts are also sent as Vercel Analytics custom events (`ai_cv_built`, `interview_started`, `interview_hint`, `interview_scored`, `cv_exported`, `cover_letter`), carrying only the event name and a short label like `pdf` or `voice`. Custom events need a Vercel plan that supports them. The choice is stored under `cvcraftai-consent-v1` and can be changed from "Your data".

**Export**
- PDF download (image-based, keeps the template design)
- Print / Save as PDF (real text layer, best for ATS parsing)
- HTML (self-contained)
- **Plain text (.txt)** — no layout, for pasting into application portals

### On scoring accuracy
No company's real ATS (Workday, Greenhouse, Taleo, iCIMS…) is publicly documented. The scores model widely agreed ATS practice — standard section headings, parseable structure, keyword alignment with the job description, quantified achievements — and do not claim to replicate any specific system. The recruiter simulation is an AI persona, not a real person, and the AI does not verify the claims in your CV.

## Running locally

```bash
npx serve .        # static app only — AI features need the /api route
# or, to include the serverless function:
npx vercel dev     # with ANTHROPIC_API_KEY set in your environment
```

## Project structure

```
cvcraftai/
├── index.html     # the whole frontend: HTML, CSS and JS
├── api/ai.js      # serverless proxy to Anthropic (streaming + non-streaming)
├── api/tts.js     # optional natural interviewer voice (needs OPENAI_API_KEY)
├── api/feedback.js# emails visitor feedback to you (needs RESEND_API_KEY)
├── api/_limits.js # shared: allowed origins + daily per-user limits (not a route)
├── vercel.json    # SPA rewrite; /api/* and /_vercel/* are excluded from it
└── README.md
```

## Customising

**Add a template.** In `index.html`:
1. Add an entry to `TPLS` with `name`, `cat` (one of the six categories) and `desc`.
2. Add a render function to `TPL`: `mytemplate: d => \`<div class="mytemplate">…</div>\``. `d` is already HTML-escaped; fields are `nm, ti, em, ph, lo, sum, skills, exps, edus, certs, langs, projs, workauth, refs`, plus `liLink` / `liLinkDark` (ready-made link HTML for light / dark backgrounds). Use `bls(e.d,'class')` for bullet lines, `projsHTML(...)` for projects, and show `e.present ? 'Present' : e.e` for end dates.
3. Add a thumbnail to `miniPrev()`.
4. Add the template's entry class (e.g. `.mytemplate-ex`) to the page-break selector lists — the `@media print` block and `protectedSel` in `doExport()` — so entries aren't split across pages.

**Change accent colours.** Edit the `COLORS` array.

## Tech stack

Vanilla HTML/CSS/JS · Claude via a Vercel serverless function · html2canvas + jsPDF (PDF export) · pdf.js (reading uploaded CVs) · Google Fonts (Plus Jakarta Sans, Inter, IBM Plex Mono) · Vercel Web Analytics

## License

MIT
