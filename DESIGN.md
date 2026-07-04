# DESIGN.md — Adwait design system

> Warm paper, one green voice, editorial calm.

**Theme:** light · **Product:** adwait.io landing page (see `COPY.md` for content) · **Last updated:** 2026-07-04

This is the single source of truth for how Adwait looks. It merges five inputs under one rule:

- **Brand wins on colors and fonts.** The palette and type below come from Adwait's own pages (`public/index.html`, `public/privacy.html`, `public/payment-support.html`) — the only place the Adwait identity currently lives.
- **References win on layout and feel.** Structure, rhythm, scale, component shapes, and restraint come from four style references: **Jeton** (editorial fintech on warm white — the structural donor, since it's the one light-theme reference), **Linear** (hairline precision, tight tracking, product-first imagery), **Dimension** (pill silhouettes, floating nav, weight-500 display restraint, numbered lists), and **Auros** (uppercase tracked eyebrows, stat counters, recessed footer well, spacious cinema).

Every choice that required judgment is recorded in the **Decision Log** at the bottom. New decisions get appended there — never edit history, add a new row.

---

## 1. Feel

Adwait should read like a magazine spread for a small honest utility: vast warm-white space, oversized quiet headlines, and a single green accent that appears only when it means something. The references agree on this even across dark and light themes, and we adopt their shared DNA:

- **Restraint over volume.** Display type is big (72px+) but never bold — weight 500, tight leading (1.0), tight tracking. Authority comes from size and space, not weight. (All four references cap display weight at ~500.)
- **Whitespace is the divider.** Sections separate through 96px+ gaps, not background stripes or rules. (Jeton.)
- **Hairlines, not shadows.** Elevation comes from 1px borders and surface tints, never drop shadows. (Linear, Auros, Dimension — unanimous.)
- **One chromatic voice.** Green is rationed the way Jeton rations orange and Linear rations acid-lime: headlines stay ink, body stays gray, and green appears only on actions, links, the logo dot, and key emphasis. If green is everywhere, it's nowhere.
- **The product is the imagery.** No stock photos, no 3D renders. The visual texture is the ad card itself, the popup, and the truth states — framed like Linear frames its app UI.
- **Honest by default.** The brand's voice ("Estimates that admit it", "Nothing fake, ever") extends to the design: real states, labeled placeholders, no decoration pretending to be content.

---

## 2. Colors

**Brand wins.** Every hex below is taken from Adwait's live pages except the two marked ▲ *derived* (extensions needed to complete the system; each has a Decision Log entry).

### Palette

| Name | Value | Token | Role |
|------|-------|-------|------|
| Adwait Green | `#187a33` | `--color-green` | The one chromatic voice — primary buttons, links, logo dot, key emphasis. Never body text, never backgrounds at full strength |
| Paper | `#fbfbf9` | `--color-paper` | Page canvas — warm off-white, the dominant field everything sits on |
| Ink | `#1d1d1b` | `--color-ink` | Headlines and primary text — warm near-black, never pure `#000` |
| Slate | `#55554f` | `--color-slate` | Body copy — warm gray that keeps long text comfortable on Paper |
| Stone | `#8b8b84` | `--color-stone` | Muted text — captions, timestamps, footer meta, disabled labels |
| Hairline | `#eaeae6` | `--color-hairline` | 1px borders and dividers on Paper — structure without weight |
| Moss Hairline | `#c9e2d0` | `--color-moss-hairline` | Green-tinted hairline — link underlines, borders on green-washed surfaces |
| Moss Wash | `#f4f7f4` | `--color-moss-wash` | Green-tinted surface — feature cards, highlighted panels, input fills |
| Moss Border | `#dbe6db` | `--color-moss-border` | Border for Moss Wash surfaces |
| Card White | `#ffffff` | `--color-white` | Card surfaces one step above Paper |
| Green Tint ▲ | `rgba(24, 122, 51, 0.08)` | `--color-green-tint` | Transparent brand tint for hover states and soft emphasis — derived from Adwait Green (Jeton's brand-tint pattern) |
| Ink Well ▲ | `#161614` | `--color-ink-well` | The single dark surface — inverted footer well only. Derived by deepening Ink one step (Auros's recessed-footer feel) |

Legacy `#2e7d32` (older pages) is retired — use Adwait Green everywhere. (Decision 003.)

### Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Paper | `#fbfbf9` | Page canvas — the default everything sits on |
| 1 | Card White | `#ffffff` | Cards and panels lifted one step above the canvas |
| 2 | Moss Wash | `#f4f7f4` | Highlighted/tinted panels — feature cards, trust rows |
| −1 | Ink Well | `#161614` | The one inverted band — final CTA + footer only. Text on it: Paper; accents: Moss Hairline / white pill CTA |

### Color rules

- One green action per view. Everything else is neutral. (Linear's single-accent discipline.)
- Body text is Slate, never Ink and never green — Ink is for headlines, green is for actions.
- No new hues. No blues, corals, violets, or category colors from the references — their layouts came along, their palettes did not.
- Green-on-Paper (`#187a33` on `#fbfbf9`) passes WCAG AA for text; keep green text at 14px+ weight 500+.
- Dark surfaces exist only as the Ink Well footer band. The page never alternates dark/light sections.

---

## 3. Typography

**Brand wins on the face; references win on how it's used.**

### Face

| Font | Token | Role |
|------|-------|------|
| System UI stack | `--font-sans` | Everything. `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif` |

Adwait ships zero webfonts. The native UI face is the brand font — instant, familiar, and honest, which fits a product whose pitch is "no account, no tracking, no filler." The references' faces (DM Sans, Inter, Matter, Sequel Sans) are overridden per the merge rule. (Decision 004.)

### Scale

Sizes are fluid where marked; tracking and leading follow the references' display discipline (tight at scale, generous at body).

| Role | Size | Weight | Line height | Tracking | Token |
|------|------|--------|-------------|----------|-------|
| display | `clamp(44px, 7.5vw, 72px)` | 500 | 1.02 | -0.022em | `--text-display` |
| heading-lg | `clamp(34px, 5vw, 48px)` | 500 | 1.08 | -0.02em | `--text-heading-lg` |
| heading | `clamp(28px, 4vw, 36px)` | 500 | 1.15 | -0.015em | `--text-heading` |
| heading-sm | 24px | 500 | 1.3 | -0.01em | `--text-heading-sm` |
| subheading | 20px | 500 | 1.4 | -0.005em | `--text-subheading` |
| body-lg | 18px | 400 | 1.6 | 0 | `--text-body-lg` |
| body | 16px | 400 | 1.6 | 0 | `--text-body` |
| body-sm | 14px | 400 | 1.55 | 0 | `--text-body-sm` |
| caption | 13px | 400 | 1.5 | 0.01em | `--text-caption` |
| eyebrow | 12px | 600 | 1.4 | 0.12em, uppercase | `--text-eyebrow` |
| stat | `clamp(40px, 6vw, 64px)` | 500 | 1.0 | -0.02em | `--text-stat` |

### Type rules

- **Weight 500 is the display ceiling.** Never 600+ for headlines — the restraint IS the feel. (Unanimous across references.) Small UI text (buttons, eyebrow labels, the wordmark) may use 600–650, matching the existing brand chrome.
- **Display leading stays at ~1.0.** Tight leading at scale is what makes the page editorial instead of default. Body stays at 1.55–1.6.
- **Eyebrows are uppercase and tracked** (0.12em) — the Auros instrumentation label, used above every section heading.
- **Reading measure is 52–60ch.** Body copy never stretches wider (existing brand: `max-width: 52ch`).
- Numbers in stats render with `font-variant-numeric: tabular-nums`.

---

## 4. Spacing, shape & layout

**References win.** Base unit 4px, comfortable-to-spacious density.

### Spacing scale

| Token | Value | | Token | Value |
|-------|-------|-|-------|-------|
| `--space-1` | 4px | | `--space-8` | 40px |
| `--space-2` | 8px | | `--space-10` | 48px |
| `--space-3` | 12px | | `--space-12` | 56px |
| `--space-4` | 16px | | `--space-16` | 64px |
| `--space-5` | 20px | | `--space-20` | 80px |
| `--space-6` | 24px | | `--space-24` | 96px |
| `--space-7` | 32px | | `--space-32` | 128px |
| | | | `--space-40` | 160px |

### Layout

- **Page max-width:** 1200px, centered (Linear/Jeton/Dimension consensus).
- **Section gap:** 96px desktop / 64px mobile (`--section-gap`). Whitespace alone separates sections.
- **Card padding:** 24–32px (`--card-padding: 28px` default).
- **Element gap:** 8–16px inside components.
- **Hero:** left-aligned editorial stack — eyebrow → display headline → one paragraph (52–60ch) → CTA row — with extreme breathing room above and below (Jeton). No centered stacks except the footer well.
- **Sections alternate** single-column editorial text and two-column text+visual compositions. Never 3+ column card walls. (Linear/Dimension.)
- **The nav floats.** Detached pill bar with visible margin from the viewport edge, never flush. (Dimension.)

### Radii

Four values are the entire shape vocabulary:

| Token | Value | Used for |
|-------|-------|----------|
| `--radius-pill` | 9999px | Buttons, nav bar, badges, status pills — the defining silhouette (Dimension/Jeton) |
| `--radius-card` | 16px | Cards, panels, inputs, the ad-card mock (Jeton/Auros consensus) |
| `--radius-input` | 12px | Form fields, small containers |
| `--radius-small` | 6px | Icon containers, tiny chips |

### Elevation

No drop shadows. Depth comes from (in order): surface steps (Paper → Card White → Moss Wash), 1px Hairline borders, and — only for the floating nav — `backdrop-filter: blur(8px)` over a translucent Paper fill plus one soft lift shadow `rgba(0, 0, 0, 0.05) 0px -4px 16px` (Jeton's inverted lift, the single shadow in the system).

| Token | Value |
|-------|-------|
| `--shadow-lift` | `rgba(0, 0, 0, 0.05) 0px -4px 16px 0px` |

---

## 5. Components

Specs are written against the page in `COPY.md`. Colors/fonts per §2–3; shapes/rhythm per §4.

### Floating Pill Nav
Detached pill bar, 16–24px from the top edge, max-width aligned to the 1200px column. `rgba(251, 251, 249, 0.85)` fill + `backdrop-filter: blur(8px)`, 1px Hairline border, `--radius-pill`, `--shadow-lift`. Contains: brand mark left (green dot 10px + "Adwait" 17px/650 Ink, the existing wordmark), ghost links center-right (14px/500 Slate), green pill CTA right. One nav CTA only.

### Primary Pill Button
Adwait Green fill, Card White text, `--radius-pill`, 12px × 24px padding, 15px/600, tracking 0.01em. Hover: deepen ~8% and no movement — no shadows, no scale. The only filled green element in a view. Used for "Install from the Chrome Web Store".

### Ghost Pill Button
Transparent fill, Ink text, 1px Hairline border, `--radius-pill`, 10px × 20px padding, 14px/500. Hover: `--color-green-tint` fill. Secondary actions ("Email support@adwait.io").

### Text Link
Adwait Green, 14–16px/600, no underline by default; 1px bottom border in Moss Hairline, becoming Adwait Green on hover (the existing brand link, kept verbatim).

### Eyebrow Label
`--text-eyebrow` (12px/600, uppercase, 0.12em), Stone color; Adwait Green when the section is action-oriented. Sits 12px above every section heading (Auros).

### Hero
Full-bleed Paper. Eyebrow → display headline in Ink (2 lines max) → body-lg paragraph in Slate at 56ch → CTA row (primary pill + "No account. No sign-up. No email." caption in Stone) → ad-card mock to the right or below. Vertical padding `--space-32` top, `--space-24` bottom.

### Numbered Step Row
For "How it works" (5 steps). Each row: two-digit index (01–05) in Stone, `--text-heading-sm` tabular, left; step title 18px/500 Ink + one body line in Slate, right. 20px row gap, 1px Hairline separator between rows, no backgrounds, no cards. (Dimension's numbered accordion + Jeton's scroll indicator.)

### Stat Counter
Large figure (`--text-stat`) in Adwait Green — the one place green renders at display size — with a 13px uppercase tracked label in Stone below. For "50%", "$5", "7s", "1s". Max three per row, 48px gaps. (Auros's statistic block, recolored.)

### Feature Card — Moss
Moss Wash fill, 1px Moss Border, `--radius-card`, `--card-padding`. Heading 20px/500 Ink, body 15px Slate. No shadow, no icon required. Used for the trust grid ("No account, ever", "Every ad says it's an ad", …), max 2 columns.

### Card — White
Card White fill, 1px Hairline border, `--radius-card`, `--card-padding`. The neutral container for anything that isn't trust/emphasis content.

### Ad Card Mock
The product-as-imagery element (Linear's screenshot-first principle): a faithful rendering of the extension's ad card — Card White, `--radius-card`, 1px Hairline, "Ad · Adwait" caption row in Stone 12px, placeholder creative area in Moss Wash. Shown floating over a corner of a muted chat-UI frame. Also renders the truth state: same card with "Out of ads right now." in Slate, centered. Never fake ad content — placeholder blocks only.

### Positioning Strip
The standalone line ("On free AI, your attention is already the product…") set as an editorial interlude: `--text-heading-lg`, weight 500, Ink, centered, max 20ch–28ch line length, `--space-24` above and below, no background, no border. The page's one big typographic moment outside the hero. (Auros's kinetic text, tamed to brand.)

### Status Pill
Inline pill for micro-announcements: Paper or Moss Wash fill, 1px Hairline, `--radius-pill`, 6px × 14px padding, 13px/500 Slate. (Dimension's status banner.)

### Footer Well
The single inverted band: Ink Well fill, full-bleed, `--space-20` vertical padding, content centered. Wordmark with green dot, tagline in Paper, links 14px in Moss Hairline (hover Card White), meta row in Stone. The page ends by sinking one level down. (Auros's recessed footer.)

---

## 6. Imagery & iconography

- **No photography, no illustration, no 3D.** The visual texture is the product: the ad card, the popup (balance, per-site switches, corner picker), and chat-UI frames rendered as muted geometry (Hairline strokes on Card White).
- The `[IMAGE: …]` markers in COPY.md map to Ad Card Mock compositions, not screenshots of third-party UIs — chat interfaces are abstracted to neutral wireframe shapes so no ChatGPT/Claude/Gemini trade dress is reproduced.
- **Icons:** minimal geometric line SVGs, 16–20px, 1.5px stroke, Ink or Stone (green only for the active/positive state), inside 6px-radius containers when contained. No emoji, no icon fonts.
- The green dot is the brand mark. It may scale up as a decorative element (e.g., hero corner) but never gains gradients, glows, or faces.

---

## 7. Do's and don'ts

### Do
- Keep the canvas Paper and separate sections with whitespace alone — 96px is structure.
- Cap display type at weight 500; let size and tight leading (1.0) carry the hierarchy.
- Ration green: one filled green element per view, green text only for links/stats/emphasis.
- Use 1px Hairline borders and surface steps for all elevation; the nav's lift shadow is the only shadow.
- Use pills for interactive silhouettes and 16px radius for containers — four radii total.
- Write real states ("Out of ads right now") into mocks — truth is a brand asset.
- Append to the Decision Log whenever a choice deviates from or extends this document.

### Don't
- Don't introduce new hues — no reference palettes (orange, lime, teal, violet) may leak in.
- Don't use pure `#000` text or pure-black surfaces; Ink and Ink Well are the darkest values.
- Don't use drop shadows on cards, buttons, or text.
- Don't set body copy in green or Ink — body is Slate at 1.6.
- Don't use webfonts — the system stack is the brand face.
- Don't center long text or build 3+ column card grids; the layout is editorial, not dashboard.
- Don't let the nav touch the viewport edge — it floats with visible margin.
- Don't alternate dark sections through the page — Ink Well appears once, at the end.

---

## 8. Quick start — CSS custom properties

```css
:root {
  /* Colors — brand */
  --color-green: #187a33;
  --color-paper: #fbfbf9;
  --color-ink: #1d1d1b;
  --color-slate: #55554f;
  --color-stone: #8b8b84;
  --color-hairline: #eaeae6;
  --color-moss-hairline: #c9e2d0;
  --color-moss-wash: #f4f7f4;
  --color-moss-border: #dbe6db;
  --color-white: #ffffff;
  --color-green-tint: rgba(24, 122, 51, 0.08);  /* derived */
  --color-ink-well: #161614;                    /* derived */

  /* Typography */
  --font-sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --text-display: clamp(44px, 7.5vw, 72px);
  --text-heading-lg: clamp(34px, 5vw, 48px);
  --text-heading: clamp(28px, 4vw, 36px);
  --text-heading-sm: 24px;
  --text-subheading: 20px;
  --text-body-lg: 18px;
  --text-body: 16px;
  --text-body-sm: 14px;
  --text-caption: 13px;
  --text-eyebrow: 12px;
  --text-stat: clamp(40px, 6vw, 64px);
  --weight-regular: 400;
  --weight-medium: 500;   /* display ceiling */
  --weight-semibold: 600; /* small UI only */
  --tracking-display: -0.022em;
  --tracking-eyebrow: 0.12em;
  --leading-display: 1.02;
  --leading-body: 1.6;

  /* Spacing */
  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
  --space-5: 20px;  --space-6: 24px;  --space-7: 32px;  --space-8: 40px;
  --space-10: 48px; --space-12: 56px; --space-16: 64px; --space-20: 80px;
  --space-24: 96px; --space-32: 128px; --space-40: 160px;

  /* Layout */
  --page-max-width: 1200px;
  --section-gap: 96px;      /* 64px below 720px viewport */
  --card-padding: 28px;
  --measure: 56ch;

  /* Shape */
  --radius-pill: 9999px;
  --radius-card: 16px;
  --radius-input: 12px;
  --radius-small: 6px;

  /* Elevation */
  --shadow-lift: rgba(0, 0, 0, 0.05) 0px -4px 16px 0px; /* floating nav only */
}
```

---

## 9. Decision Log

Every design choice gets a row. Append only — supersede with a new row rather than editing. Status: **Accepted** / **Provisional** (needs owner sign-off) / **Superseded by #NNN**.

| # | Date | Decision | Rationale | Winner | Status |
|---|------|----------|-----------|--------|--------|
| 001 | 2026-07-04 | Brand palette & type sourced from the live Adwait pages (`public/*.html`) | No separate brand-kit file was among the uploads; the live site (green `#187a33`, Paper, Ink, system-ui) is the only existing Adwait identity | Brand | **Provisional** — owner to confirm this is the intended brand kit |
| 002 | 2026-07-04 | Light theme; Jeton is the structural donor | Brand colors are light (Paper canvas). Jeton is the sole light reference, so its editorial-white layout carries the structure; Linear/Dimension/Auros contribute feel patterns translated to light | References | Accepted |
| 003 | 2026-07-04 | Retire legacy green `#2e7d32`; `#187a33` is canonical | Two greens exist across old pages; the newest page (index) uses `#187a33` | Brand | Accepted |
| 004 | 2026-07-04 | Keep the system-ui stack; adopt no reference webfonts | Brand wins on fonts, and the live brand uses the native stack. Zero-latency native type also matches the "no account, no tracking, no filler" ethos. DM Sans/Inter/Matter/Sequel are overridden | Brand | Accepted |
| 005 | 2026-07-04 | Display type: weight 500 ceiling, ~1.0 leading, -0.022em tracking | All four references independently cap display weight at ~500 with tight leading — this restraint is the shared "feel" the references win on. Overrides the current site's 650-weight headline habit at display sizes | References | Accepted |
| 006 | 2026-07-04 | Green is rationed to one filled element per view | Every reference builds around a single rationed accent (lime, orange, gradient). Green inherits that discipline | References | Accepted |
| 007 | 2026-07-04 | Pill buttons + floating pill nav; 16px cards; four radii total | Dimension's pill silhouette and floating nav are its signature; Jeton/Auros agree on 16px containers. Linear/Auros's 6px button radius loses to the pill consensus | References | Accepted |
| 008 | 2026-07-04 | No drop shadows except the nav's single lift shadow | Linear/Auros/Dimension unanimously use hairlines + surface tints for elevation; Jeton contributes the one inverted lift shadow, reserved for the floating nav | References | Accepted |
| 009 | 2026-07-04 | 1200px max-width, 96px section gaps, whitespace-only separation | Three of four references use 1200px; Linear's 96px rhythm + Jeton's whitespace-only rule set the pace | References | Accepted |
| 010 | 2026-07-04 | Derived tokens: Green Tint `rgba(24,122,51,0.08)`, Ink Well `#161614` | The brand palette lacked a hover tint and a footer-well surface. Both are derived from existing brand values (Green, Ink) rather than imported from references | Brand (derived) | Accepted |
| 011 | 2026-07-04 | One inverted Ink Well band at the footer only; no dark/light alternation | Auros's recessed footer well is the feel; Jeton's whitespace-only rule forbids alternating bands elsewhere | References | Accepted |
| 012 | 2026-07-04 | Product-as-imagery: ad card mock + abstract chat frames; no photography, no third-party trade dress | Linear's screenshot-first principle, adapted — we render our own ad card and abstract the host UIs to wireframes | References | Accepted |
| 013 | 2026-07-04 | Reference accent palettes excluded wholesale | Jeton's category colors, Linear's lime/status colors, Auros's gradients, Dimension's violet — all conflict with "brand wins on colors" | Brand | Accepted |
