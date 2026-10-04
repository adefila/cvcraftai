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
- Only accepts requests from `localhost`, `127.0.0.1`, or an `https://*.vercel.app` host containing `cvcraftai`. **A custom domain will get `403 Forbidden` until you add it to `isAllowedOrigin`.**
- 20 requests per minute per IP (in-memory, best effort), prompts up to 8,000 characters, responses capped at 1,500 tokens.

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
