# CVCraft AI: design notes

A calm, compact, premium tool. Quiet warm neutrals, one accent, soft elevated panels, short and purposeful motion. The CV preview is the star, so the chrome stays out of its way.

All of it lives in `index.html`: tokens in `:root`, and a block called **INTERFACE OVERHAUL** at the end of the stylesheet that refines components by source order. Delete that block to get the previous look back.

## Layout
- Maximum width **1180px**, centred. The header and the workspace share one setting (`--maxw`), so they always line up.
- Desktop (1024px and up): the editor is a floating white panel (radius 20px, hairline border, soft shadow) on the page background, beside the live preview. Panel width is `clamp(380px, 36%, 440px)`.
- Below 1024px the layout is unchanged: stacked editor and preview, scrolling page, tabs scroll sideways.
- The header is 60px, frosted (`backdrop-filter: blur(14px)`), with a 26px wordmark and a "Beta" pill centred on the lowercase letters.

## Tokens
| Purpose | Token |
|---|---|
| Ink / muted text | `--ink #17171C`, `--muted #6B6B73` (4.9:1 on the page background) |
| Surfaces | `--bg #F6F5F2`, `--surf #EFEEEA`, `--card #FFF` |
| Lines | `--bdr #E8E6E1`, `--bdr-strong #D8D5CE` |
| Accent | `--ac #4F5BD5`, `--ac-soft`, `--ac-ring` (focus and selection ring) |
| Radius | `--r-sm 10`, `--r-md 14`, `--r-lg 20`, pills 999 |
| Elevation | `--sh-1` (rest), `--sh-2` (hover, paper), `--sh-3` (overlays, menus) |

Type: Plus Jakarta Sans for headings and the wordmark, Inter for everything else, IBM Plex Mono for numbers. Weights are 500 / 600 / 700 / 800 by role, not ad hoc.

## Components and states
Every interactive element has rest, hover, pressed, focus and disabled states.
- **Primary button**: ink fill. Hover lifts 1px with `--sh-2`. Pressed settles to 98%. Keyboard focus draws a 2px accent outline that follows the pill shape.
- **Outline / small buttons**: border darkens on hover, press scales to 98%.
- **Fields**: 1px border, hover darkens it, focus swaps to the accent with a 3px ring (no layout jump). Font is 14.5px on desktop and stays 16px on phones so iOS does not zoom.
- **Tabs**: a segmented control; the active tab is a white card.
- **Template cards**: hover lifts 2px; the selected one gets an accent border and ring.
- **Next-step strip**: one soft accent tint (it used to switch between orange, purple and indigo).
- **Overlays**: frosted backdrop, 20px radius, `--sh-3`.

## Motion
One easing (`--ease: cubic-bezier(.22,1,.36,1)`), three durations: 120ms (state changes), 200ms (hover and lift), 360ms (reveals).
- Opening a tab: its sections rise in 10px and fade, staggered 30ms apart (first seven; the rest share one delay). Template cards stagger the same way.
- Modals and the privacy banner: rise and fade in. Toasts and menus: short fade and slide.
- Entrance animations run only before and during playback (`backwards`), so they never freeze hover transforms.
- `prefers-reduced-motion: reduce` turns every animation and transition effectively off.

## First run and flow
- An empty CV shows a start card (build with AI, import, blank form). The header badge stays neutral until there is content, and the preview is labelled "example".
- One target job (the pasted job post) is shown as a chip in the preview header, because four features use it.
- Interview setup uses interviewer cards and two segmented switches that drive hidden selects, so the interview code did not change.

## Theme and accessibility
- Dark theme is opt-in (`data-theme="dark"` on `<html>`, key `cvcraftai-theme`). It redefines the tokens, then overrides the few surfaces with hard-coded light colours and the colours scripts write inline. `.paper` and `#print-target` reset the tokens to light, and `doExport` removes the theme while exporting.
- Check dark mode with a contrast scan (text under 3.2:1 on its real background) on every tab and dialog.
- Dialogs go through `mkModal`: role="dialog", focus moves in and is trapped, Esc closes, focus returns to the opener.
- Tabs: `role="tablist"`, arrow keys, roving tabindex. `role="button"` elements already activate on Enter and Space (global handler), so do not add another key handler.
- Loading AI answers show a skeleton (`AI_SKEL`). Check marks use `ICO_CHECK` / `ICO_X` instead of text glyphs.

## Rules for future changes
- Colour, radius, shadow and timing come from tokens. Do not add one-off values.
- New buttons and fields reuse the existing classes (`btn-pill`, `btn-pill-outline`, `btn-pill-sm`, `fi`).
- Keep the CV templates' own CSS separate from the app chrome; exports and print depend on it.
- Check any change at 320, 768, 1024 and 1440px wide.
