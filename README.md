# CVCraft AI — ATS-Optimized CV Builder

A sleek, AI-powered CV builder with 14 professional templates, real-time ATS scoring, JD keyword matching, and one-click PDF export. Single static frontend plus one tiny serverless function — no framework, no database.

![CVCraft AI](https://img.shields.io/badge/CVCraft-AI%20Powered-4F5BFF?style=flat-square)
![Templates](https://img.shields.io/badge/Templates-11-0EA5E9?style=flat-square)
![ATS](https://img.shields.io/badge/ATS-Optimized-0F9D58?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-D97706?style=flat-square)

---

## Critical setup step: the AI features need one environment variable

The previous version called `api.anthropic.com` directly from the browser. That cannot work on a real deployed site — browsers block cross-origin calls to Anthropic's API (CORS), and even if they didn't, it would expose your API key to every visitor. This is almost certainly why you saw "AI request failed."

The fix: a tiny serverless function at `/api/ai.js` now holds your API key server-side and proxies requests. **You must add your key in Vercel for this to work:**

1. Go to your Vercel project → **Settings → Environment Variables**
2. Add a new variable: Name = `ANTHROPIC_API_KEY`, Value = your key from [console.anthropic.com](https://console.anthropic.com)
3. Redeploy (Vercel → Deployments → ⋯ → Redeploy)

Without this step, every AI feature (Analyse & Enhance, JD Gap Analysis, Write with AI) will fail with a clear error message telling you the key is missing — it won't fail silently.

## What's new in this build
- **Fixed blank PDF download** — root cause: the CV clone was rendered off-screen at `left:-9999px`, and `html2canvas` cannot reliably capture elements positioned outside the viewport bounds — several versions silently return a blank canvas for this. Fixed by keeping the clone in normal document flow (no `position:fixed`/`absolute`) inside a `height:0;overflow:hidden` wrapper, which is invisible to the user but fully readable by html2canvas. Also added a blank-canvas detector that inspects actual pixel data before saving — if a PDF would come out blank, you get a clear warning instead of a silent empty download.
- **Certifications and Languages are now proper add/edit lists** — matching Experience and Education exactly: click "+ Add Certification" or "+ Add Language", fill a small form, edit or remove any entry afterward. No more cramming multiple credentials into one text field.
- **Logo resized to 32px** with a correspondingly shorter top bar.
- **AI features actually work now** — fixed via the serverless proxy below. All three AI entry points (main analysis, JD gap analysis, and the in-modal bullet writer) route through `/api/ai` instead of calling Anthropic directly.
- **"Write with AI" inside the Experience modal** — generates 3-4 ready-to-use bullet points for the specific role you're adding, using the same anti-cliché, metric-driven prompt rules as the main AI Review. Click "Use" per line or "Use all" — nothing is auto-applied without your action.
- **Edit Experience/Education** — the edit icon on each entry reopens the same modal pre-filled, so saving updates in place instead of duplicating.
- **Date picker + "Present" toggle** — start date is a native month picker; end date disables and switches to "Present" via a checkbox instead of typing text.
- **Fixed modal overflow bug** — the End date field was visually overflowing its container. Root cause: the date input's native calendar-icon UI has a fixed intrinsic width that ignored its flex column without `min-width:0`. Fixed at the source.
- **1200px max-width layout** — the topbar and full workspace are now centred and capped at 1200px.
- **3 new templates: Monolith, Lattice, Aurora** — see table below.
- **Work Authorization + References fields**, plus Certifications/Languages above — all commonly missing from CVs and a real cause of silent ATS rejections; now factored into the ATS score too.
- **Weak Word Scanner** — automatically scans your entire CV against a list of recruiter-flagged clichés, no AI call needed.
- **Unified AI Review** — one call returns a reasoned score, rewrite suggestions, and ATS keywords together.


## Features

### 14 Distinct Templates
| Template | Best For |
|----------|----------|
| **Classic** | Any traditional industry, maximum ATS safety — single column, zero flourish |
| **Nova** | Tech, design, startups — dark sidebar with skill bars |
| **Apex** | Senior/VP roles — dark header band, chip skills |
| **Prism** | Any industry — Swiss-grid minimal, dot-rating skills |
| **Strand** | Career changers — timeline rail, chronological |
| **Folio** | Creative roles — accent stripe, pill-outline skills |
| **Zenith** | Finance, law, academia — centred, symmetric |
| **Carbon** | Engineers, developers — full dark mode |
| **Pulse** | Product, SaaS, startups — metric cards, tag cloud |
| **Meridian** | Senior creative/brand — asymmetric two-tone editorial, numbered sections |
| **Axis** | Data, engineering, analytical roles — technical grid, monospace, numbered markers |
| **Monolith** | Senior creative, architecture, brand strategy — brutalist-editorial, oversized type |
| **Lattice** | Engineering, operations, data — precise card-grid skills, two-tone header |
| **Aurora** | Product, customer success, people-facing roles — soft rounded cards, pill tags |

### Typography
- **Display:** Plus Jakarta Sans — geometric, distinctive headings
- **Body:** Inter — 16px base size across all UI for comfortable reading
- **Mono:** IBM Plex Mono — contact details, dates, technical chips
- CV preview text is intentionally kept at print-realistic sizes (10–13px) since it mirrors an actual printed document, not app UI

### On ATS scoring accuracy
No company's actual ATS algorithm — Workday, Greenhouse, Taleo, iCIMS, or whatever Google, Amazon, Apple, or Meta runs internally — is publicly documented. Those systems are proprietary and not reverse-engineerable from outside. What this app scores against instead is the well-documented, broadly-agreed set of ATS parsing and keyword-matching practices: standard section headers, clean parseable formatting, keyword/skill alignment with a job description, and quantified achievements. The app is upfront about this distinction directly in the ATS panel — it is not claiming to replicate any specific company's internal system.

### On AI accuracy
The AI Review feature makes a single Claude API call with your complete CV text and target role, returning a reasoned score, specific improvement suggestions, and relevant keywords together — rather than three disconnected calls each missing context the others have. This combined-context approach produces more consistent, grounded output. Accuracy still scales directly with input specificity: vague CV content produces vague feedback, while detailed achievements with real numbers produce sharper, more specific suggestions. The AI does not verify factual claims in your CV — it reasons over what you provide.


### AI Features (Anthropic Claude API)
- **AI Review** — One unified call: enter your target role (and optionally paste a job description) and get a reasoned quality score, 3 specific rewrite suggestions, and missing ATS keywords — all from a single pass over your complete CV, so nothing contradicts itself.
- **JD Gap Analysis** — In the JD Match tab, paste any job description and get a focused AI gap analysis with prioritised recommendations specific to that role.

### JD Keyword Matcher
- Paste a job description and instantly see your match percentage
- Missing keywords highlighted — click to add to your skills
- Found keywords shown in green for confidence

### Live ATS Scoring
- Real-time score out of 100 across 12 criteria
- Full breakdown panel with pass/fail per section
- Score ring updates as you type

### Export Options
- **PDF** via html2pdf.js — clean, ATS-parseable
- **Print / Save as PDF** — browser native
- **HTML** — self-contained file, open anywhere

### Design System
- 8 accent colors (Indigo, Sky, Emerald, Amber, Red, Violet, Pink, Teal)
- All colors propagate across every template instantly
- Live mini-previews in the template picker update with your accent color

---

## Getting Started

### Option 1 — Just open it
```bash
git clone https://github.com/yourusername/cvcraftai.git
cd cvcraftai
open index.html   # macOS
# or double-click index.html on Windows/Linux
```

### Option 2 — GitHub Pages
1. Fork this repo
2. Go to **Settings → Pages**
3. Set source to **main branch / root**
4. Your app is live at `https://yourusername.github.io/cvcraftai`

### Option 3 — Serve locally
```bash
npx serve .
# or
python3 -m http.server 8080
```

---

## AI Setup

See "Critical setup step" near the top of this README — add `ANTHROPIC_API_KEY` in Vercel's Environment Variables and redeploy. That's the only setup required; the frontend already calls `/api/ai`, not Anthropic directly.

If you're not deploying to Vercel, any platform that supports a single serverless/edge function (Netlify Functions, Cloudflare Workers, AWS Lambda) works the same way — just adapt `api/ai.js`'s export signature to that platform's convention and update the fetch URL in `index.html`'s `callAI()` function if the path differs.

> **Note:** Templates, ATS scoring, the Weak Word Scanner, and JD keyword matching all work fully offline with zero API key. Only AI Review, JD Gap Analysis, and Write with AI need the key.

---

## Project Structure

```
cvcraftai/
├── index.html       # Entire frontend — HTML, CSS, JS in one file
├── api/
│   └── ai.js         # Serverless function — proxies Claude API calls, keeps your key server-side
├── vercel.json        # Routes /api/ai to the function, everything else to index.html
└── README.md
```

This is a static frontend plus exactly one serverless function — no framework, no database, no build step for the HTML. Works on Vercel's free tier as-is.

---

## Customisation

### Add a new template
In `index.html`, add to the `TPLS` object:
```js
TPLS.mytemplate = {
  name: 'My Template',
  desc: 'Description of when to use this template.'
};
```

Then add the render function to the `TPL` object:
```js
TPL.mytemplate = d => `<div class="mytemplate">
  <!-- your template HTML here -->
  <!-- d.nm, d.ti, d.em, d.ph, d.lo, d.li, d.sum, d.skills, d.exps, d.edus -->
</div>`;
```

And add a mini preview to `miniPrev()`:
```js
case 'mytemplate': return `<div><!-- tiny SVG/HTML preview --></div>`;
```

### Change accent colors
Edit the `COLORS` array:
```js
const COLORS = [
  { hex: '#6366F1', name: 'Indigo' },
  // add or change colors here
];
```

---

## ATS Scoring Criteria

Live, rule-based, instant feedback as you type:

| Criteria | Points |
|----------|--------|
| Full name | 8 |
| Valid email format | 8 |
| Phone number | 5 |
| Location | 4 |
| Strong summary (80+ chars) | 12 |
| Work experience (1+ roles) | 15 |
| Multiple roles | 5 |
| Education | 8 |
| Skills (5+ listed) | 10 |
| Comprehensive skills (10+) | 4 |
| Achievement bullet points (3+) | 10 |
| Quantified achievements (numbers/%) | 8 |
| Strong action verbs | 5 |
| LinkedIn / portfolio link | 3 |
| Certifications listed | 4 |
| Languages listed | 2 |
| Work authorization stated | 3 |

**Total: 114 points, capped at 100%**

A separate Weak Word Scanner (also instant, rule-based) flags recruiter-disliked clichés anywhere in your summary or bullets, independent of the numeric score.

This sits alongside the AI Review's reasoned score (0–100), which judges the CV holistically rather than as a checklist — the two are intentionally separate signals, shown in different places, so one doesn't silently override the other.

---

## Tech Stack

- **Vanilla HTML/CSS/JS** — no framework, no build step
- **Anthropic Claude API** — AI enhance and gap analysis
- **html2pdf.js** — PDF export via CDN
- **Google Fonts** — Sora, Inter, JetBrains Mono

---

## License

MIT — use it, fork it, ship it.

---

Built with Claude by Anthropic.
