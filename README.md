# CVCraft AI — ATS-Optimized CV Builder

A sleek, AI-powered CV builder with 8 professional templates, real-time ATS scoring, JD keyword matching, and one-click PDF export. Built as a single HTML file — no install, no backend, no dependencies to manage.

![CVCraft AI](https://img.shields.io/badge/CVCraft-AI%20Powered-6366F1?style=flat-square)
![Templates](https://img.shields.io/badge/Templates-8-0EA5E9?style=flat-square)
![ATS](https://img.shields.io/badge/ATS-Optimized-10B981?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-F59E0B?style=flat-square)

---

## Features

### 8 Distinct Templates
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

### AI Features (Anthropic Claude API)
- **AI Enhance** — Enter your target role and get 3 specific, actionable improvements plus ATS keywords you can add with one click
- **JD Gap Analysis** — Paste any job description and get an AI-powered gap analysis with prioritised recommendations

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

The app scores your CV on 12 criteria:

| Criteria | Points |
|----------|--------|
| Full name | 10 |
| Email address | 10 |
| Phone number | 5 |
| Location | 5 |
| Professional summary (60+ chars) | 15 |
| Work experience (1+ roles) | 20 |
| Multiple roles | 5 |
| Education | 10 |
| Skills (3+ listed) | 10 |
| Strong skills section (8+) | 5 |
| Achievement bullet points | 10 |
| Quantified achievements (numbers/%) | 5 |

**Total: 110 points, capped at 100%**

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
