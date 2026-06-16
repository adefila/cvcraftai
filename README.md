# CVCraft AI — ATS-Optimized CV Builder

A sleek, AI-powered CV builder with 11 professional templates, real-time ATS scoring, JD keyword matching, and one-click PDF export. Built as a single HTML file — no install, no backend, no dependencies to manage.

![CVCraft AI](https://img.shields.io/badge/CVCraft-AI%20Powered-4F5BFF?style=flat-square)
![Templates](https://img.shields.io/badge/Templates-11-0EA5E9?style=flat-square)
![ATS](https://img.shields.io/badge/ATS-Optimized-0F9D58?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-D97706?style=flat-square)

---

## What's new in this build
- **Edit Experience/Education** — the edit icon on each entry reopens the same modal pre-filled, so saving updates in place instead of duplicating.
- **Date picker + "Present" toggle** — start date is a native month picker; end date disables and switches to "Present" via a checkbox instead of typing text.
- **1200px max-width layout** — the topbar and full workspace are now centred and capped at 1200px, so the app doesn't stretch unreasonably wide on large monitors.
- **Fixed PDF rendering** — the previous export occasionally cropped content or misaligned multi-column templates. Root cause: `html2canvas` was capturing before the cloned node had a full reflow/paint cycle, and the PDF page height was hardcoded rather than measured. Fixed by waiting on `document.fonts.ready`, forcing a synchronous reflow, waiting two animation frames plus a settle delay, measuring the actual rendered height via `scrollHeight`, and setting `pagebreak: avoid-all` so no column gets sliced across a page boundary.
- **Weak Word Scanner** — a new section in the ATS tab automatically scans your entire CV (summary + every experience bullet) against a list of recruiter-flagged clichés (e.g. "leverage", "synergy", "team player", "results-driven") and shows what to write instead, with no AI call needed — instant and free.
- **Sharper AI rewrites** — the AI prompt now explicitly bans common AI-sounding phrases, requires concrete numbers where the CV supports them, and produces one ready-to-copy rewritten line per analysis rather than only abstract advice. Suggestions are shown as text with a copy button — nothing auto-overwrites your fields.
- **Unified AI Review** — one Claude call returns a reasoned score, specific rewrite suggestions, and ATS keywords together, instead of disconnected calls.


## Features

### 11 Distinct Templates
| Template | Best For |
|----------|----------|
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
| **Standard** | Traditional industries, maximum ATS safety — classic black-text format, zero flourish |

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

The app calls the Anthropic API directly from the browser. To enable AI features:

1. Get an API key at [console.anthropic.com](https://console.anthropic.com)
2. Open `index.html` and find the fetch call to `https://api.anthropic.com/v1/messages`
3. For production, proxy this through your own backend to keep the key safe

> **Note:** The AI Enhance and JD Analysis features require an Anthropic API key. The rest of the app (templates, ATS scoring, JD keyword matching) works fully offline without any API key.

---

## Project Structure

```
cvcraftai/
└── index.html    # Entire app — HTML, CSS, JS in one file
```

Single-file architecture means:
- Zero build step
- Zero dependencies to install
- Works offline (except AI features)
- Easy to deploy anywhere static files are served

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

**Total: 105 points, capped at 100%**

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
