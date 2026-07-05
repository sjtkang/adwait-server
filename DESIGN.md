# DESIGN.md — Adwait design system

> Warm paper, one green voice, editorial calm.

**Theme:** light · **Product:** adwait.io landing page (see `COPY.md` for content) · **Last updated:** 2026-07-04

This is the single source of truth for how Adwait looks. It merges five inputs under one rule:

- **Brand wins on colors and fonts.** The palette and type below come from Adwait's own pages (`public/index.html`, `public/privacy.html`, `public/payment-support.html`, `public/admin.html`) — the only place the Adwait identity currently lives.
- **References win on layout and feel.** Structure, rhythm, scale, component shapes, and restraint come from four style references: **Jeton** (editorial fintech on warm white — the structural donor, since it's the one light-theme reference), **Linear** (hairline precision, tight tracking, product-first imagery), **Dimension** (pill silhouettes, floating nav, weight-500 display restraint, numbered lists), and **Auros** (uppercase tracked eyebrows, stat counters, recessed footer well, spacious cinema).

Every choice that required judgment is recorded in the **Decision Log** at the bottom. New decisions get appended there — never edit history, add a new row.

---

## 1. Feel

Adwait should read like a magazine spread for a small honest utility: vast warm-white space, oversized quiet headlines, and a single green accent that appears only when it means something. The references agree on this even across dark and light themes, and we adopt their shared DNA:

- **Restraint over volume.** Display type is big (72px+) but never bold — weight 500, tight leading (1.0), tight tracking. Authority comes from size and space, not weight. (All four references cap display weight at ~500.)
- **Whitespace is the divider.** Sections separate through 96px gaps (Linear's rhythm), never background stripes or rules (Jeton's whitespace-only rule).
- **Hairlines, not shadows.** Elevation comes from surface steps and 1px borders — Linear's hairline discipline, Dimension's 1px borders, Auros's shadow-free surface stack. One sanctioned exception: the floating nav's soft lift shadow (§4).
- **One chromatic voice.** Green is rationed the way Jeton rations orange and Linear rations acid-lime: headlines stay ink, body stays gray, and green appears only on the primary action, links, the logo dot, and key emphasis. If green is everywhere, it's nowhere.
- **The product is the imagery.** No stock photos, no 3D renders. The visual texture is the ad card itself, the popup, and the truth states — framed like Linear frames its app UI.
- **Honest by default.** The brand's voice ("Estimates that admit it", "Nothing fake, ever") extends to the design: real states, labeled placeholders, no decoration pretending to be content.

---

## 2. Colors

**Brand wins.** Every hex below is taken from Adwait's live pages except the one marked ▲ *derived* (an extension needed to complete the system; see Decision 011).

### Palette

| Name | Value | Token | Role |
|------|-------|-------|------|
| Adwait Green | `#187a33` | `--color-green` | The one chromatic voice — the primary button, links, logo dot, key emphasis. Never body text, never backgrounds at full strength |
| Paper | `#fbfbf9` | `--color-paper` | Page canvas — warm off-white, the dominant field everything sits on |
| Ink | `#1d1d1b` | `--color-ink` | Headlines and primary text — warm near-black, never pure `#000` |
| Slate | `#55554f` | `--color-slate` | Body copy — warm gray that keeps long text comfortable on Paper |
| Stone | `#8b8b84` | `--color-stone` | Muted text — captions, timestamps, footer meta, disabled labels |
| Hairline | `#eaeae6` | `--color-hairline` | 1px borders and dividers on Paper — structure without weight |
| Moss Hairline | `#c9e2d0` | `--color-moss-hairline` | Green-tinted hairline — link underlines, borders on green-washed surfaces |
| Moss Wash | `#f4f7f4` | `--color-moss-wash` | Green-tinted surface — feature cards, highlighted panels, input fills |
| Moss Border | `#dbe6db` | `--color-moss-border` | Border for Moss Wash surfaces |
| Card White | `#ffffff` | `--color-white` | Card surfaces one step above Paper (from `admin.html`) |
| Ink Well | `#161616` | `--color-ink-well` | The single dark surface — inverted footer well only (from `admin.html`'s button fill) |
| Green Tint ▲ | `rgba(24, 122, 51, 0.08)` | `--color-green-tint` | Transparent brand tint for hover states and soft emphasis — derived from Adwait Green (Jeton's brand-tint pattern) |

Consolidations: legacy `#2e7d32` is retired in favor of Adwait Green (Decision 003); `#1a1a1a` and `#666` from the older pages fold into Ink and Stone (Decision 004). The admin page's utility grays (`#eee`, `#ccc`, `#e2e2e2`) and alert red (`#c0392b`) are internal-tool chrome, not brand.

### Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Paper | `#fbfbf9` | Page canvas — the default everything sits on |
| 1 | Card White | `#ffffff` | Cards and panels lifted one step above the canvas |
| 2 | Moss Wash | `#f4f7f4` | Highlighted/tinted panels — feature cards, trust rows |
| −1 | Ink Well | `#161616` | The one inverted band — footer only. Text: Paper; links: Moss Hairline; meta: Stone |

### Color rules

- **One green action per view** — the page's single primary CTA. The nav's CTA pill is ink-filled (§5), and green states inside product mocks (popup switches, active pickers) are imagery, not actions — they don't count against the ration. (Decision 007.)
- Body text is Slate, never Ink and never green — Ink is for headlines, green is for actions.
- No new hues. No blues, corals, violets, or category colors from the references — their layouts came along, their palettes did not.
- Green-on-Paper (`#187a33` on `#fbfbf9`) passes WCAG AA for normal text (≈5.3:1); still, keep green text at 14px+ weight 500+. Eyebrows and captions below 14px stay Stone.
- Dark surfaces exist only as the Ink Well footer band. The page never alternates dark/light sections.

---

## 3. Typography

**Brand wins on the face; references win on how it's used.**

### Face

| Font | Token | Role |
|------|-------|------|
| System UI stack | `--font-sans` | Everything. `system-ui, -apple-system, sans-serif` — the brand stack, verbatim from the live pages |

Adwait ships zero webfonts. The native UI face is the brand font — instant, familiar, and honest, which fits a product whose pitch is "no account, no tracking, no filler." The references' faces (DM Sans, Inter, Matter, Sequel Sans) are overridden per the merge rule. (Decision 005.)

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

- **Weight 500 is the display ceiling.** Never 600+ for headlines — the restraint IS the feel. (Unanimous across references.) Small UI text (buttons, eyebrow labels) may use 600, and the 17px wordmark keeps its brand-chrome 650 (`--weight-wordmark`).
- **Display leading stays at ~1.0.** Tight leading at scale is what makes the page editorial instead of default. Body stays at 1.55–1.6.
- **Display tracking is negative** (-0.022em), following Linear, Auros, and Dimension; Jeton's positive display tracking was set aside. (Decision 006.)
- **Eyebrows are uppercase and tracked** (0.12em) — the Auros instrumentation label, used above section headings.
- **Reading measure is 52–60ch.** Body copy never stretches wider (existing brand: `max-width: 52ch`).
- Numbers in stats, balances, and step indices render with `font-variant-numeric: tabular-nums`.

---

## 4. Spacing, shape & layout

**References win.** Base unit 4px, comfortable-to-spacious density. Token names are 4px multipliers (`--space-N` = N × 4px).

### Spacing scale

| Token | Value | | Token | Value |
|-------|-------|-|-------|-------|
| `--space-1` | 4px | | `--space-10` | 40px |
| `--space-2` | 8px | | `--space-12` | 48px |
| `--space-3` | 12px | | `--space-14` | 56px |
| `--space-4` | 16px | | `--space-16` | 64px |
| `--space-5` | 20px | | `--space-20` | 80px |
| `--space-6` | 24px | | `--space-24` | 96px |
| `--space-8` | 32px | | `--space-32` | 128px |
| | | | `--space-40` | 160px |

### Layout

- **Page max-width:** 1200px, centered (Linear/Jeton/Dimension consensus; Auros's 1440px loses).
- **Section gap:** 96px desktop / 64px mobile (`--section-gap`). Whitespace alone separates sections.
- **Card padding:** 24–32px (`--card-padding: 28px` default).
- **Element gap:** 8–16px inside components.
- **Hero:** left-aligned editorial stack — eyebrow → display headline → one paragraph (52–60ch) → CTA row — with extreme breathing room above and below (Jeton). 
- **Alignment:** content is left-aligned. The only centered moments are the Positioning Strip and the Footer Well (Decision 015).
- **Sections alternate** single-column editorial text and two-column text+visual compositions. Never 3+ column card walls. (Linear/Dimension.)
- **The nav floats.** Detached pill bar with visible margin from the viewport edge, never flush. (Dimension.)

### Radii

Four values are the entire shape vocabulary:

| Token | Value | Used for |
|-------|-------|----------|
| `--radius-pill` | 9999px | Buttons, nav bar, badges, status pills — Dimension's signature silhouette, adopted over the 6–12px button radii of the other three references (Decision 008) |
| `--radius-card` | 16px | Cards, panels, the ad-card and popup mocks (Jeton/Auros consensus) |
| `--radius-input` | 12px | Form fields, small containers |
| `--radius-small` | 6px | Icon containers, tiny chips, picker cells |

### Elevation

No drop shadows on cards, buttons, or text. Depth comes from (in order): surface steps (Paper → Card White → Moss Wash), 1px Hairline borders, and — only for the floating nav — `backdrop-filter: blur(4px)` (Dimension's nav blur) over a translucent Paper fill plus one soft lift shadow `rgba(0, 0, 0, 0.05) 0px -4px 16px` (Jeton's inverted lift, the single shadow in the system).

| Token | Value |
|-------|-------|
| `--shadow-lift` | `rgba(0, 0, 0, 0.05) 0px -4px 16px 0px` |

---

## 5. Components

Specs are written against the page in `COPY.md`. Colors/fonts per §2–3; shapes/rhythm per §4.

### Floating Pill Nav
Detached pill bar, 16–24px from the top edge, max-width aligned to the 1200px column. `rgba(251, 251, 249, 0.85)` fill + `backdrop-filter: blur(4px)`, 1px Hairline border, `--radius-pill`, `--shadow-lift`. Contains: brand mark left (green dot 10px + "Adwait" 17px/650 Ink — the existing wordmark, kept verbatim), ghost links center-right (14px/500 Slate), and an **ink pill CTA** right (Ink fill, Paper text — the neutral high-contrast pill, mirroring Linear's white sign-up pill and Dimension's white pill CTA, inverted for the light canvas). Green stays rationed to the page's primary CTA. One nav CTA only.

### Primary Pill Button
Adwait Green fill, Card White text, `--radius-pill`, 12px × 24px padding, 16px/600, tracking 0.01em. Hover: deepen ~8%, no movement — no shadows, no scale. The only filled green element in a view. Used for "Install from the Chrome Web Store".

### Ghost Pill Button
Transparent fill, Ink text, 1px Hairline border, `--radius-pill`, 10px × 20px padding, 14px/500. Hover: `--color-green-tint` fill. Secondary actions ("Email support@adwait.io").

### Text Link
Adwait Green, 14–16px/600, no underline by default; 1px bottom border in Moss Hairline, becoming Adwait Green on hover (the existing brand link, kept verbatim).

### Eyebrow Label
`--text-eyebrow` (12px/600, uppercase, 0.12em), Stone — always Stone, never green (below the 14px green-text floor, §2). Sits 12px above section headings (Auros). Text derives from COPY.md's `[SECTION: …]` markers (e.g. HOW IT WORKS, TRUST, FOR ADVERTISERS) — structural chrome, not copy claims; omit where no natural section name exists. (Decision 016.)

### Hero
Full-bleed Paper. Eyebrow → display headline in Ink (2 lines max) → body-lg paragraph in Slate at 56ch → CTA row (primary pill button) → two caption lines in Stone ("No account. No sign-up. No email." / "Works on chatgpt.com, claude.ai and gemini.google.com.") → ad-card mock to the right or below. Vertical padding `--space-32` top, `--space-24` bottom.

### Numbered Step Row
For "How it works" (5 steps). Each row: step title 18px/500 Ink plus one body line in Slate, left; two-digit index (01–05) right-aligned in Stone, `--text-heading-sm`, tabular. 20px row gap, no borders, no backgrounds — whitespace-only rows. (Dimension's numbered accordion, kept verbatim and recolored; Jeton's scroll indicator numbering.)

### Stat Counter
Large figure (`--text-stat`) in Adwait Green — the one place green renders at display size — with a 13px uppercase tracked label in Stone below. Max three per row, 48px gaps. (Auros's statistic block, recolored.) **Library-only for now:** COPY.md has no standalone stat section — do not restructure inline copy ("50%", "$5") into a stat row to justify this component.

### Feature Card — Moss
Moss Wash fill, 1px Moss Border, `--radius-card`, `--card-padding`. Heading 20px/500 Ink, body 14px Slate. No shadow, no icon required. Used for the trust grid ("No account, ever", "Every ad says it's an ad", …), max 2 columns.

### Card — White
Card White fill, 1px Hairline border, `--radius-card`, `--card-padding`. The neutral container for anything that isn't trust/emphasis content.

### Ad Card Mock
The product-as-imagery element (Linear's screenshot-first principle): a faithful rendering of the extension's ad card — Card White, `--radius-card`, 1px Hairline, "Ad · Adwait" caption row in Stone 12px, placeholder creative area in Moss Wash. Shown floating over a corner of a muted chat-UI frame. Also renders the truth state: same card with "Out of ads right now." in Slate, centered. Never fake ad content — placeholder blocks only.

### Popup Mock
The extension popup as imagery (COPY.md's second image): Card White frame, `--radius-card`, 1px Hairline, 20px padding. Balance figure in `--text-heading-sm` tabular Ink with a 12px Stone label; per-site rows (site name 14px Slate + toggle switch — track Adwait Green when on, Hairline track with Stone thumb when off); corner picker as a 2×2 grid of `--radius-small` cells, active cell Adwait Green, inactive Moss Wash. Green states here are product imagery, exempt from the one-green-action ration (§2).

### Positioning Strip
The standalone line ("On free AI, your attention is already the product…") set as an editorial interlude: `--text-heading-lg`, weight 500, Ink, centered, max 20–28ch line length, `--space-24` above and below, no background, no border. The page's one big typographic moment outside the hero. (Auros's kinetic text, tamed to brand; one of the two sanctioned centered moments, Decision 015.)

### Status Pill
Inline pill for micro-announcements: Paper or Moss Wash fill, 1px Hairline, `--radius-pill`, 6px × 14px padding, 13px/500 Slate. (Dimension's status banner.)

### Footer Well
The single inverted band: Ink Well fill, full-bleed, `--space-20` vertical padding, content centered. Wordmark with green dot, tagline in Paper, links 14px in Moss Hairline (hover Card White), meta row in Stone. The page ends by sinking one level down. (Auros's recessed footer.)

---

## 6. Imagery & iconography

- **No photography, no illustration, no 3D.** The visual texture is the product: the Ad Card Mock, the Popup Mock, and chat-UI frames rendered as muted geometry (Hairline strokes on Card White).
- The `[IMAGE: …]` markers in COPY.md map to the two mock components, not screenshots of third-party UIs — chat interfaces are abstracted to neutral wireframe shapes so no ChatGPT/Claude/Gemini trade dress is reproduced.
- **Icons:** minimal geometric line SVGs, 16–20px, 1.5px stroke, Ink or Stone (green only for the active/positive state), inside `--radius-small` containers when contained. No emoji, no icon fonts.
- The green dot is the brand mark. It may scale up as a decorative element (e.g., hero corner) but never gains gradients, glows, or faces.

---

## 7. Do's and don'ts

### Do
- Keep the canvas Paper and separate sections with whitespace alone — 96px is structure.
- Cap display type at weight 500; let size and tight leading (1.0) carry the hierarchy.
- Ration green: one filled green element per view (the primary CTA); green text only for links/stats/emphasis at 14px+.
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
- Don't center content outside the Positioning Strip and Footer Well, and don't build 3+ column card grids — the layout is editorial, not dashboard.
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
  --color-ink-well: #161616;
  --color-green-tint: rgba(24, 122, 51, 0.08);  /* derived */

  /* Typography */
  --font-sans: system-ui, -apple-system, sans-serif;  /* brand stack, verbatim */
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
  --weight-medium: 500;    /* display ceiling */
  --weight-semibold: 600;  /* small UI only */
  --weight-wordmark: 650;  /* brand chrome: the 17px wordmark only */
  --tracking-display: -0.022em;
  --tracking-eyebrow: 0.12em;
  --leading-display: 1.02;
  --leading-body: 1.6;

  /* Spacing — --space-N = N x 4px */
  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
  --space-5: 20px;  --space-6: 24px;  --space-8: 32px;  --space-10: 40px;
  --space-12: 48px; --space-14: 56px; --space-16: 64px; --space-20: 80px;
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
| 001 | 2026-07-04 | Brand palette & type sourced from the live Adwait pages (`public/index.html`, `privacy.html`, `payment-support.html`, `admin.html`) | No separate brand-kit file was among the uploads; the live site (green `#187a33`, Paper, Ink, system-ui) is the only existing Adwait identity | Brand | **Provisional** — owner to confirm this is the intended brand kit |
| 002 | 2026-07-04 | Light theme; Jeton is the structural donor | Brand colors are light (Paper canvas). Jeton is the sole light reference, so its editorial-white layout carries the structure; Linear/Dimension/Auros contribute feel patterns translated to light | References | Accepted |
| 003 | 2026-07-04 | Retire legacy green `#2e7d32`; `#187a33` is canonical | Two greens exist across old pages; the newest page (index) uses `#187a33` | Brand | Accepted |
| 004 | 2026-07-04 | Consolidate neutrals: `#1a1a1a` → Ink `#1d1d1b`, `#666` → Stone `#8b8b84`; admin utility grays (`#eee`, `#ccc`, `#e2e2e2`) and alert red `#c0392b` stay internal-tool chrome, outside the brand palette | The older pages carry near-duplicate neutrals; the newest page (index) sets the warm-neutral direction. One value per role | Brand | Accepted |
| 005 | 2026-07-04 | Keep the brand's system-ui stack verbatim (`system-ui, -apple-system, sans-serif`); adopt no reference webfonts | Brand wins on fonts, and the live brand uses the native stack. Zero-latency native type also matches the "no account, no tracking, no filler" ethos. DM Sans/Inter/Matter/Sequel are overridden | Brand | Accepted |
| 006 | 2026-07-04 | Display type: weight 500 ceiling, ~1.0 leading, -0.022em tracking | All four references cap display weight at ~500 with tight leading. Negative tracking follows Linear/Auros/Dimension (3 of 4); Jeton's positive display tracking is set aside. Overrides the current site's default-bold `h1` (no declared weight); the brand's 650 weight survives only on the 17px wordmark | References | Accepted |
| 007 | 2026-07-04 | Green rationed to one filled element per view — the primary CTA. The nav CTA is an ink-filled pill; green states inside product mocks are imagery, exempt from the ration | Every reference builds around a single rationed accent, and Linear/Dimension both keep their nav CTA neutral (white pill) so the one chromatic action stays unique | References | Accepted |
| 008 | 2026-07-04 | Pill buttons + floating pill nav (Dimension's signature, 1 of 4); 16px cards (Jeton/Auros); four radii total | The pill silhouette is Dimension's defining trait, adopted over the 6px (Linear, Auros) and 12px (Jeton) button radii — a signature pick, not a consensus. Cards at 16px are the Jeton/Auros consensus | References | Accepted |
| 009 | 2026-07-04 | Elevation = surface steps + 1px hairlines; single lift shadow (Jeton's `0 -4px 16px`) and 4px backdrop blur (Dimension) on the floating nav only | Auros and Dimension ban box-shadows outright; Linear is border-first with only subtle dark shadows; Jeton documents two soft shadows. The merge keeps the strictest common ground plus Jeton's one lift for the nav | References | Accepted |
| 010 | 2026-07-04 | 1200px max-width, 96px section gaps, whitespace-only separation | Three of four references use 1200px (Auros's 1440px loses); Linear's 96px rhythm + Jeton's whitespace-only rule set the pace | References | Accepted |
| 011 | 2026-07-04 | One derived token: Green Tint `rgba(24,122,51,0.08)`. Ink Well uses the brand's own `#161616` (admin.html button fill) rather than an invented dark | The brand palette lacked a hover tint; it is derived from Adwait Green. A dark surface already existed in the brand pages, so nothing else is invented | Brand (one derived) | Accepted |
| 012 | 2026-07-04 | One inverted Ink Well band at the footer only; no dark/light alternation | Auros's recessed footer well is the feel; Jeton's whitespace-only rule forbids alternating bands elsewhere | References | Accepted |
| 013 | 2026-07-04 | Product-as-imagery: Ad Card Mock + Popup Mock + abstract chat frames; no photography, no third-party trade dress | Linear's screenshot-first principle, adapted — we render our own ad card and popup, and abstract the host UIs to wireframes | References | Accepted |
| 014 | 2026-07-04 | Reference accent palettes excluded wholesale | Jeton's category colors, Linear's lime/status colors, Auros's gradients, Dimension's violet — all conflict with "brand wins on colors" | Brand | Accepted |
| 015 | 2026-07-04 | Centered content is limited to exactly two moments: the Positioning Strip and the Footer Well | Dimension's layout rule ("generally left-aligned, no centered stacks") wins by default; the strip and footer are sanctioned editorial exceptions | References | Accepted |
| 016 | 2026-07-04 | Eyebrow labels take their text from COPY.md's `[SECTION: …]` markers and are always Stone | COPY.md forbids invented copy; section markers are structure, not claims. Stone-only keeps 12px text above the green-text floor rule | References | Accepted |
