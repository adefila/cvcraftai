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
- Two request shapes: `{ prompt }` (up to 8,000 characters) or `{ system, messages }` for multi-turn use (`system` up to 9,000 characters; up to 40 messages of at most 12,000 characters each and 30,000 in total, roles `user`/`assistant`, starting and ending with `user`). Add `stream: true` for server-sent events. The model is fixed server-side.

## Features

**Building**
- 33 templates in six categories: Minimal (7), Modern (6), Executive (4), Creative (4), Technical (6), Bold (6)
- 8 accent colours that apply to every template
- Experience, education, projects, certifications, languages, social links, work authorisation
- Autosave to the browser, plus backup/restore as a JSON file
- **CV versions** — save named copies (e.g. "Google — Product Manager") and switch between them in one click
- Live page-length indicator (1 page / ≈1.4 pages / long)
- Works on phone, tablet and desktop (the editor stacks above the preview below 1024px)

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
  - **Hint** (lightbulb) — stuck on a question? It gives three short talking points and a draft answer built only from your CV. Nothing is sent until you press "Use as my answer", and you can edit it. The scorer is told when a hint was used.
  - **Spoken answers are cleaned up** before they go in: misheard words, punctuation and "um/uh" are fixed, with no new facts added.
  - **Studio voice (optional)** — set `OPENAI_API_KEY` in Vercel to give interviewers a natural voice through `api/tts.js` (model `gpt-4o-mini-tts`). Only the interviewer's words are sent. Without the key the app keeps using browser voices.
- **Build my CV with AI** — for people who can't write a CV: they describe themselves in plain words (typed or spoken) and AI drafts the whole CV. It only uses what they say, saves the old CV as a version first, and lists what to double-check. Found on the Build tab and the "..." menu.
- **Your data** note in the "..." menu explains in plain words what stays in the browser and what is sent to AI services
- **Privacy choice** — a first-visit banner (Accept / No thanks). CVCraft sets no cookies. Accept allows AI requests and loads Vercel Analytics. No thanks keeps analytics off and asks before the first AI request of each visit. The choice is stored under `cvcraftai-consent-v1` and can be changed from "Your data".

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
