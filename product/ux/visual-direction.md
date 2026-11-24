# Visual direction — two proposals (pick one)

**Status:** Draft — awaiting product owner selection (B8)

Operating defaults B8: the UX designer proposes **two** directions and the product owner picks one before any UI ticket starts. These two are genuinely different propositions, not two tints of the same idea. One treats ProofDesk as a **drawing set**; the other treats it as a **lit gallery**. They differ in ground value, depth model, type voice, emotional register and in which user they privilege.

---

## 0. Shared token contract (identical in both directions)

Both directions define **the same custom-property names with different values**. Selecting a direction replaces one file — `src/styles/tokens.css` — and nothing else. Builders can start structural work before the decision lands, and the losing direction costs nothing.

Rules that bind both directions:
- No hardcoded colour, type size, spacing, radius, duration or easing anywhere in components. If a value is needed and no token exists, that is a question for this document, not a local constant.
- shadcn/ui defaults are **remapped** to these tokens, not consumed as shipped. An unmodified shadcn card is a review failure.
- The work (image/PDF) is never tinted, overlaid, filtered or blended by either direction. Chrome may be opinionated; the drawing may not be touched.
- Both directions ship a **true-white page mat** behind PDFs and images (`--color-page-mat`), because an architect's drawing must be judged on its own white, not on the app's ground.

### Token names

```
Colour      --color-ground --color-surface --color-surface-raised --color-surface-sunken
            --color-canvas-mat --color-page-mat
            --color-hairline --color-hairline-strong
            --color-text --color-text-secondary --color-text-muted --color-text-oncolor
            --color-accent --color-accent-hover --color-accent-active --color-accent-subtle
            --color-focus
            --color-status-draft --color-status-published --color-status-approved
            --color-status-changes --color-status-danger
            --color-studio-only-bg --color-studio-only-border
            --color-pin --color-pin-selected --color-pin-resolved --color-pin-pending
Type        --font-display --font-text --font-numeric
            --text-micro --text-label --text-sm --text-base --text-lg --text-title --text-display
            --leading-tight --leading-normal --leading-relaxed --tracking-label --tracking-display
Space       --space-1 … --space-10 --space-gutter --space-section
Shape       --radius-none --radius-sm --radius-md --radius-lg --radius-pill
Depth       --elevation-0 --elevation-1 --elevation-2 --elevation-canvas --inset-sunken
Motion      --duration-instant --duration-fast --duration-normal --duration-slow
            --ease-standard --ease-out-expo --ease-in
Interaction --focus-ring-width --focus-ring-offset --tap-min
```

Contrast figures below are computed from the listed hex values (WCAG 2.1 relative-luminance formula). They are **design intent**; CI must re-verify with axe-core on the built UI (A11, A12).

---

## Direction A — "Drawing Set"

> Swiss-rationalist, paper-and-graphite. ProofDesk looks like a well-organised drawing set: a measured sheet, hairline rules, a title block, sheet metadata in mono, and one blueprint-blue ink that only ever means "act here".

### Rationale for this audience

Architects already live inside a visual system with a century of discipline behind it: the sheet, the grid, the title block, the revision cloud, the stamp. Direction A borrows that system rather than importing SaaS conventions. For the **studio** it reads as professional-grade instrument software — dense where density helps, silent everywhere else. For the **homeowner client** the near-white ground is the single best background for judging a plan, an elevation or a material board: it is what the drawing was authored against, and it is what a printed set looks like on their kitchen table. The emotional promise is *competence and record-keeping* — exactly what the approval surface needs, since the product's hardest copy problem is sounding factual without sounding legal.

### Depth and layering strategy (no generic shadows)

Depth comes from **paper, not shadow**:
1. **Tonal paper layers.** Three near-white values (ground / surface / raised) separated by 2–4% luminance, so panels read as sheets laid on a desk.
2. **Hairlines as structure.** 1 px rules at `--color-hairline` define the grid; `--color-hairline-strong` (3.3:1) carries any boundary that also carries meaning.
3. **A sunken canvas well.** The review canvas sits in an inset trough (`--inset-sunken`) a shade darker than the ground, so the work sits *in* the sheet, not on it.
4. **Overlap, not float.** Panels overlap the canvas edge by `--space-4` with a hairline and a 1-value tonal step — the sheet-edge move — rather than a drop shadow.
5. **Title-block metadata.** Stage, round, version and timestamps are set in mono at `--text-micro` with letterspacing, in a bordered block. This is the signature of the direction and the thing that stops it reading as a Tailwind template.
6. **Only one true shadow** exists (`--elevation-2`), reserved for things genuinely above the page: modal, popover, mobile bottom sheet.

### Typography pairing strategy

| Role | Family | Why |
|---|---|---|
| Display + UI | **Archivo** (variable, OFL) | A grotesque with slightly narrow proportions, so long project and file names fit without truncation; tightens convincingly at display sizes where Inter goes bland. |
| Text | **Archivo** at 400/500 | One text family keeps the page quiet and the bundle small. |
| Numeric / metadata | **IBM Plex Mono** (OFL) | Version numbers, round numbers, page counts, timestamps, submission ids and snapshot references. Mono here is semantic: *this is record data*, which supports the approval-evidence job. |

Pairing strategy = **one grotesque, one mono, no third voice.** Hierarchy is created by scale contrast (`--text-display` is ~4.6× `--text-base`), weight (400 ↔ 650), and case+tracking for labels — never by adding typefaces. Project and submission titles use `--tracking-display` (negative) at 650; everything structural uses uppercase `--text-label` with `--tracking-label`.

### Palette with roles and contrast

| Token | Value | Role | Contrast |
|---|---|---|---|
| `--color-ground` | `#F7F6F3` | App background (warm paper) | — |
| `--color-surface` | `#FFFFFF` | Cards, panels, sheets | 1.08:1 vs ground (tonal step) |
| `--color-surface-raised` | `#FFFFFF` + `--elevation-2` | Modal, popover, sheet | — |
| `--color-surface-sunken` | `#EDEBE6` | Canvas well, table headers, code-ish blocks | — |
| `--color-canvas-mat` | `#E4E1DA` | Behind the work in the review canvas | — |
| `--color-page-mat` | `#FFFFFF` | Directly behind a PDF page / image | — |
| `--color-hairline` | `#D8D4CC` | Decorative rules and grid lines only | 1.3:1 — never the sole boundary of a control |
| `--color-hairline-strong` | `#8A857C` | Input borders, meaningful boundaries | **3.3:1** vs ground (meets 1.4.11) |
| `--color-text` | `#16181A` | Headings, body | **15.4:1** on ground |
| `--color-text-secondary` | `#4A4F55` | Supporting text | **7.5:1** |
| `--color-text-muted` | `#656C73` | Mono metadata, timestamps | **4.9:1** (≥4.5 for small text) |
| `--color-text-oncolor` | `#FFFFFF` | Text on accent/status fills | **6.6:1** on accent |
| `--color-accent` | `#1F4FD8` | Primary action, links, focus, active pin | **6.1:1** on ground |
| `--color-accent-hover` | `#1A43B8` | — | 7.3:1 |
| `--color-accent-active` | `#15379A` | — | 8.7:1 |
| `--color-accent-subtle` | `#E8EDFC` | Selected row, accent wash | text `#16181A` on it: 14.4:1 |
| `--color-focus` | `#1F4FD8` | Focus ring | 6.1:1 vs ground; 3:1 vs every surface it lands on |
| `--color-status-draft` | `#656C73` | Draft submission | 4.9:1 |
| `--color-status-published` | `#1F4FD8` | Published, awaiting response | 6.1:1 |
| `--color-status-approved` | `#1E6B4F` | Approved | **5.9:1** on ground, 6.4:1 white-on |
| `--color-status-changes` | `#8A4B00` | Changes requested | **6.3:1** on ground |
| `--color-status-danger` | `#9B1C1C` | Revoked, infected, destructive | **7.5:1** on ground |
| `--color-studio-only-bg` | `#F2EFE6` | The studio-only region (scope classification, rounds) | text 14.0:1 |
| `--color-studio-only-border` | `#8A857C` | Its boundary, dashed 1px + lock glyph | 3.3:1 |
| `--color-pin` | `#1F4FD8` | Open pin, white numeral inside | 6.6:1 numeral |
| `--color-pin-selected` | `#15379A` + 3px white ring | — | — |
| `--color-pin-resolved` | `#1E6B4F` | Resolved thread | 6.4:1 numeral |
| `--color-pin-pending` | `#1F4FD8` at 45% + dashed ring | Posting / post-failed | decorative; paired with text |

Status is **never colour alone**: every status carries a word, and approved/changes/danger each have a distinct glyph.

### Tokens — Direction A

```css
:root {
  /* Colour */
  --color-ground: #F7F6F3;
  --color-surface: #FFFFFF;
  --color-surface-raised: #FFFFFF;
  --color-surface-sunken: #EDEBE6;
  --color-canvas-mat: #E4E1DA;
  --color-page-mat: #FFFFFF;
  --color-hairline: #D8D4CC;
  --color-hairline-strong: #8A857C;
  --color-text: #16181A;
  --color-text-secondary: #4A4F55;
  --color-text-muted: #656C73;
  --color-text-oncolor: #FFFFFF;
  --color-accent: #1F4FD8;
  --color-accent-hover: #1A43B8;
  --color-accent-active: #15379A;
  --color-accent-subtle: #E8EDFC;
  --color-focus: #1F4FD8;
  --color-status-draft: #656C73;
  --color-status-published: #1F4FD8;
  --color-status-approved: #1E6B4F;
  --color-status-changes: #8A4B00;
  --color-status-danger: #9B1C1C;
  --color-studio-only-bg: #F2EFE6;
  --color-studio-only-border: #8A857C;
  --color-pin: #1F4FD8;
  --color-pin-selected: #15379A;
  --color-pin-resolved: #1E6B4F;
  --color-pin-pending: #1F4FD8;

  /* Type */
  --font-display: "Archivo Variable", "Archivo", system-ui, sans-serif;
  --font-text: "Archivo Variable", "Archivo", system-ui, sans-serif;
  --font-numeric: "IBM Plex Mono", ui-monospace, monospace;

  --text-micro:   0.6875rem;                                   /* 11px — mono labels, title-block data */
  --text-label:   0.75rem;                                     /* 12px — uppercase section labels */
  --text-sm:      0.8125rem;                                   /* 13px — table/meta */
  --text-base:    clamp(0.9375rem, 0.90rem + 0.18vw, 1rem);    /* 15 → 16 */
  --text-lg:       clamp(1.0625rem, 1.00rem + 0.3vw, 1.1875rem);
  --text-title:    clamp(1.375rem, 1.15rem + 1.1vw, 2rem);
  --text-display:  clamp(2rem, 1.3rem + 3.4vw, 4.25rem);

  --leading-tight: 1.08;
  --leading-normal: 1.45;
  --leading-relaxed: 1.65;
  --tracking-label: 0.08em;
  --tracking-display: -0.022em;

  /* Space — 4px base, with a deliberate jump at 6/7 so rhythm is not uniform */
  --space-1: 0.25rem;  --space-2: 0.5rem;   --space-3: 0.75rem;
  --space-4: 1rem;     --space-5: 1.5rem;   --space-6: 2.5rem;
  --space-7: 4rem;     --space-8: 6rem;     --space-9: 8rem;  --space-10: 12rem;
  --space-gutter: clamp(1rem, 0.6rem + 1.6vw, 2rem);
  --space-section: clamp(2.5rem, 2rem + 3vw, 6rem);

  /* Shape — low radius; the sheet has corners */
  --radius-none: 0;
  --radius-sm: 2px;
  --radius-md: 3px;
  --radius-lg: 4px;
  --radius-pill: 999px;   /* category chips and pins only */

  /* Depth — hairlines and tone, one real shadow */
  --elevation-0: none;
  --elevation-1: inset 0 0 0 1px var(--color-hairline);
  --elevation-2: 0 1px 1px rgba(22,24,26,.04), 0 10px 28px -8px rgba(22,24,26,.18);
  --elevation-canvas: inset 0 1px 0 rgba(22,24,26,.06);
  --inset-sunken: inset 0 1px 3px rgba(22,24,26,.07);

  /* Motion — short, mechanical, no bounce */
  --duration-instant: 70ms;
  --duration-fast: 130ms;
  --duration-normal: 220ms;
  --duration-slow: 360ms;
  --ease-standard: cubic-bezier(.2,0,.2,1);
  --ease-out-expo: cubic-bezier(.16,1,.3,1);
  --ease-in: cubic-bezier(.4,0,1,1);

  /* Interaction */
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;
  --tap-min: 44px;
}
```

### Interaction states — Direction A

| State | Treatment |
|---|---|
| Rest (primary button) | `--color-accent` fill, `--color-text-oncolor`, `--radius-sm`, 1px inset top highlight `rgba(255,255,255,.14)` |
| Hover | fill → `--color-accent-hover`; `translateY(-1px)`; `--duration-fast`. Transform/colour only |
| Active | fill → `--color-accent-active`; `translateY(0)`; inset `0 1px 2px rgba(0,0,0,.2)` — it depresses into the sheet |
| Focus-visible | 2px `--color-focus` ring, 2px offset, **plus** a 1px white inner ring so the ring survives on accent and dark surfaces |
| Rest (secondary/ghost) | transparent, 1px `--color-hairline-strong`, `--color-text` |
| Hover (secondary) | background `--color-accent-subtle`, border → `--color-accent` |
| Disabled | `--color-text-muted` on `--color-surface-sunken`, no border change, **always paired with the reason in text** |
| Row hover (lists) | left 2px `--color-accent` rule slides in from 0 → full height over `--duration-fast`; background → `#FBFAF8` |
| Pin hover | 1.12× scale on the marker, not the position; 44px invisible hit area regardless |
| Link | `--color-accent`, underline offset 0.18em, thickens 1px → 2px on hover |
| Drag (reorder) | lifted row gets `--elevation-2` and 2° rotation; the gap it leaves is a dashed `--color-hairline-strong` outline |

### References — what to borrow

| Reference | Borrow |
|---|---|
| **Linear** (app chrome) | Keyboard-first density, how status is communicated in a single quiet row, and restraint in colour — not its dark gradient aesthetic |
| **Stripe Dashboard** (data surfaces) | Record-detail layout: monospaced ids, label/value pairs, and timestamps treated as evidence. Directly applicable to the approval record (P13) |
| **A real architectural title block / Pentagram-style Swiss grid work** | The mono metadata block, hairline rules, uppercase tracked labels, and the discipline of one accent |

### Accessibility notes — Direction A
- Light ground gives the most headroom: all text pairs listed are ≥4.9:1 and the primary pairs are ≥7:1 (AAA body text).
- Non-text contrast (1.4.11): `--color-hairline-strong` 3.3:1 and `--color-focus` ≥3:1 against every surface it can land on. `--color-hairline` is decorative and never the only boundary of a control.
- Focus ring is a double ring (outer accent + inner white) so it is visible on paper, on accent fills, and over the photographic work in the canvas.
- Reduced motion (`prefers-reduced-motion: reduce`): all `--duration-*` collapse to `1ms`; the row-hover rule and pin settle become instant state changes; the drag lift keeps the elevation change but drops rotation and translation; zoom/pan remains (it is user-driven, not decorative).
- Forced-colors / high-contrast: hairlines fall back to `ButtonBorder`, accent to `Highlight`, and the studio-only region keeps its dashed border (a border survives forced colors; a background tint does not).

### What Direction A optimises for / trades away
**Optimises for:** judging drawings accurately; studio-side density and scanning; the approval record reading as evidence; the highest accessibility headroom; the lowest implementation cost on Tailwind + shadcn; excellent print/PDF export of the approval record; smallest font payload.
**Trades away:** emotional warmth on the client's first impression — a homeowner opening a render on their phone gets correctness rather than delight. Renders and material boards look *less* impressive on a light warm ground than on a dark one. It demands discipline: executed carelessly it degrades into "another admin tool", because its whole character lives in hairline and mono detail that a builder can flatten without noticing.

---

## Direction B — "Lit Gallery"

> Dark, warm exhibition space with editorial type. The client surfaces are a gallery at dusk: a warm near-black plaster ground, the work lit in a pool of light, museum-label typography, and brass as the one warm accent. The studio surfaces are the lighter "back-of-house" variant of the same system.

### Rationale for this audience

The moment that sells ProofDesk to a studio is the moment their client opens a render on a phone and reacts. Direction B designs for that moment. A dark warm ground removes the browser from the experience and makes renders, photography and material boards look the way they look in a presentation PDF or on a studio's own portfolio site — which is where architects' *own* visual taste already lives. The museum-label register (small tracked caps for stage and round, an editorial serif for titles) frames the submission as **a piece of work being presented**, not a ticket in a queue. For the studio it signals that ProofDesk makes their work look expensive, which is a real purchase driver for a practice whose brand is its output.

It carries one deliberate asymmetry: **client surfaces are dark, studio admin surfaces are light.** `--color-ground` and friends are redefined under a `data-surface="studio"` scope. That is honest about the fact that reading a dense feedback inbox and presenting a render want opposite grounds.

### Depth and layering strategy

Depth comes from **light, not borders**:
1. **A light pool.** The work sits on `--color-page-mat` (true white) with an outward warm glow (`--elevation-canvas`) that falls off into the dark ground. The work is literally the brightest thing on the screen — a direct expression of "the work is the interface".
2. **Stacked warm darks.** Four values from `--color-ground` through `--color-surface-raised`, each step warmer *and* lighter, so panels read as planes at different distances rather than as bordered boxes.
3. **Real elevation.** Two-layer shadows with a warm tint and a 1px top highlight (`rgba(255,255,255,.06)`) — the standard physical cue for a lit interior.
4. **Overlapping plinth.** The submission context block overlaps the bottom edge of the work by `--space-5`, like a gallery label on the wall beneath a piece.
5. **Grain.** A single ~2% monochrome noise layer on the ground only (never on the work), fixed, non-animated, as one small inline asset. This is what keeps the darks from looking like default dark mode.
6. **Brass hairlines** (`--color-hairline-strong`) used sparingly as a bottom rule under section labels, never as a full box.

### Typography pairing strategy

| Role | Family | Why |
|---|---|---|
| Display | **Fraunces** (variable, OFL; `opsz` high, `SOFT`/`WONK` at 0) | A high-contrast transitional serif with real optical sizing. At `--text-display` it has the editorial authority a presentation needs; dialled down it stays legible. Used for submission titles, project names, and the decision receipt heading. |
| Text + UI | **Inter Tight** (variable, OFL) | Neutral, dense, excellent on small dark screens; carries all body, form and table text and all museum-style labels as uppercase + `--tracking-label`. |
| Numeric | **Inter Tight** with `font-variant-numeric: tabular-nums` | Keeps the family count at two (performance rule) while still aligning version and round numbers. The approval record uses tabular lining figures rather than a mono voice. |

Pairing strategy = **serif for the work, sans for the apparatus.** The serif appears only where the product is presenting; it never appears in a form label, a table header or a button. That rule is the whole discipline of the direction, and breaking it is what makes serif/sans pairings look amateur.

### Palette with roles and contrast

Client (dark) scope:

| Token | Value | Role | Contrast |
|---|---|---|---|
| `--color-ground` | `#14120F` | App background (warm near-black plaster) | — |
| `--color-surface` | `#1E1B17` | Panels, sheets | 1.10:1 vs ground |
| `--color-surface-raised` | `#272219` | Modal, bottom sheet, popover | — |
| `--color-surface-sunken` | `#0E0D0B` | Canvas surround, table header | — |
| `--color-canvas-mat` | `#0E0D0B` | Behind the work | — |
| `--color-page-mat` | `#FDFCFA` | Directly behind a PDF page / image — **always near-white, never dark** | — |
| `--color-hairline` | `#332E27` | Decorative rules | 1.3:1 — decorative only |
| `--color-hairline-strong` | `#6E6558` | Input borders, meaningful boundaries | **3.3:1** vs ground |
| `--color-text` | `#F4F0E8` | Headings, body | **16.6:1** on ground, 15.1:1 on surface |
| `--color-text-secondary` | `#B8B0A3` | Supporting text | **8.8:1** on ground, 8.0:1 on surface |
| `--color-text-muted` | `#8A8377` | Labels, timestamps | **5.0:1** on ground |
| `--color-text-oncolor` | `#14120F` | Text on brass/status fills | **8.6:1** on accent |
| `--color-accent` | `#D8A657` | Primary action, links, active pin (brass) | **8.5:1** on ground |
| `--color-accent-hover` | `#E6B869` | — | 10.2:1 |
| `--color-accent-active` | `#C0913F` | — | 6.9:1 |
| `--color-accent-subtle` | `#2A2318` | Selected row, accent wash | `--color-text` on it: 13.9:1 |
| `--color-focus` | `#F4F0E8` | Focus ring (light ring on dark, inverted on the white page mat) | 16.6:1 vs ground |
| `--color-status-draft` | `#8A8377` | Draft | 5.0:1 |
| `--color-status-published` | `#D8A657` | Published, awaiting response | 8.5:1 |
| `--color-status-approved` | `#7FC8A3` | Approved | **8.6:1** on ground |
| `--color-status-changes` | `#E8A24B` | Changes requested | 8.0:1 — **always with a distinct glyph**, since it is close in hue to brass |
| `--color-status-danger` | `#E8766A` | Revoked, infected, destructive | **6.5:1** on ground |
| `--color-studio-only-bg` | `#241F18` | Studio-only region | text 12.6:1 |
| `--color-studio-only-border` | `#6E6558` | Dashed border + lock glyph | 3.3:1 |
| `--color-pin` | `#D8A657` | Open pin, `#14120F` numeral | 8.6:1 numeral |
| `--color-pin-selected` | `#FDFCFA` fill + brass 3px ring | — | — |
| `--color-pin-resolved` | `#7FC8A3` | Resolved thread | 8.6:1 numeral |
| `--color-pin-pending` | brass at 45% + dashed ring | Posting / post-failed | decorative, paired with text |

**Pin-on-white problem, solved explicitly:** pins sit on the white page mat, not on the dark ground, so brass-on-white is only 2.2:1. Every pin therefore carries a `#14120F` 1.5px outer stroke and a `#14120F` numeral, giving ≥8:1 against both the brass fill and the white page. This is a required part of the direction, not an implementation detail.

Studio (light) scope — `[data-surface="studio"]` overrides only these:

| Token | Value | Contrast |
|---|---|---|
| `--color-ground` | `#F6F3EE` | — |
| `--color-surface` | `#FFFFFF` | — |
| `--color-surface-sunken` | `#EBE6DD` | — |
| `--color-text` | `#1A1713` | 15.6:1 |
| `--color-text-secondary` | `#4D463D` | 8.0:1 |
| `--color-text-muted` | `#645D4E` | 4.9:1 |
| `--color-accent` | `#8A5A10` | 5.6:1 (brass darkened for a light ground; `#D8A657` would be 1.9:1 and is forbidden here) |
| `--color-text-oncolor` | `#FFFFFF` | 5.9:1 on accent |
| `--color-status-approved` | `#1E6B4F` | 5.8:1 |
| `--color-status-changes` | `#8A4B00` | 6.2:1 |
| `--color-status-danger` | `#9B1C1C` | 7.4:1 |
| `--color-hairline` / `-strong` | `#DCD5C9` / `#8A8275` | 1.3:1 / 3.3:1 |

### Tokens — Direction B

```css
:root {
  /* Colour — client / presentation (dark) */
  --color-ground: #14120F;
  --color-surface: #1E1B17;
  --color-surface-raised: #272219;
  --color-surface-sunken: #0E0D0B;
  --color-canvas-mat: #0E0D0B;
  --color-page-mat: #FDFCFA;
  --color-hairline: #332E27;
  --color-hairline-strong: #6E6558;
  --color-text: #F4F0E8;
  --color-text-secondary: #B8B0A3;
  --color-text-muted: #8A8377;
  --color-text-oncolor: #14120F;
  --color-accent: #D8A657;
  --color-accent-hover: #E6B869;
  --color-accent-active: #C0913F;
  --color-accent-subtle: #2A2318;
  --color-focus: #F4F0E8;
  --color-status-draft: #8A8377;
  --color-status-published: #D8A657;
  --color-status-approved: #7FC8A3;
  --color-status-changes: #E8A24B;
  --color-status-danger: #E8766A;
  --color-studio-only-bg: #241F18;
  --color-studio-only-border: #6E6558;
  --color-pin: #D8A657;
  --color-pin-selected: #FDFCFA;
  --color-pin-resolved: #7FC8A3;
  --color-pin-pending: #D8A657;

  /* Type */
  --font-display: "Fraunces Variable", "Fraunces", Georgia, serif;
  --font-text: "Inter Tight Variable", "Inter Tight", system-ui, sans-serif;
  --font-numeric: "Inter Tight Variable", "Inter Tight", system-ui, sans-serif;

  --text-micro:   0.6875rem;
  --text-label:   0.75rem;
  --text-sm:      0.8125rem;
  --text-base:    clamp(0.9375rem, 0.90rem + 0.18vw, 1rem);
  --text-lg:      clamp(1.125rem, 1.05rem + 0.35vw, 1.25rem);
  --text-title:   clamp(1.5rem, 1.2rem + 1.4vw, 2.375rem);
  --text-display: clamp(2.25rem, 1.3rem + 4.2vw, 5.25rem);

  --leading-tight: 1.04;
  --leading-normal: 1.5;
  --leading-relaxed: 1.7;
  --tracking-label: 0.14em;    /* museum label */
  --tracking-display: -0.015em;

  /* Space — larger base rhythm; the gallery needs air */
  --space-1: 0.25rem;  --space-2: 0.5rem;  --space-3: 0.875rem;
  --space-4: 1.25rem;  --space-5: 2rem;    --space-6: 3rem;
  --space-7: 4.5rem;   --space-8: 7rem;    --space-9: 10rem; --space-10: 14rem;
  --space-gutter: clamp(1.25rem, 0.8rem + 2vw, 2.5rem);
  --space-section: clamp(3rem, 2.2rem + 4vw, 8rem);

  /* Shape — softer, but never uniform: canvas 0, panels 10, chips pill */
  --radius-none: 0;
  --radius-sm: 4px;
  --radius-md: 10px;
  --radius-lg: 18px;
  --radius-pill: 999px;

  /* Depth — real light */
  --elevation-0: none;
  --elevation-1: 0 1px 0 rgba(255,255,255,.05) inset, 0 2px 10px -4px rgba(0,0,0,.6);
  --elevation-2: 0 1px 0 rgba(255,255,255,.07) inset, 0 18px 48px -14px rgba(0,0,0,.75);
  --elevation-canvas: 0 0 0 1px rgba(216,166,87,.12), 0 32px 90px -28px rgba(216,166,87,.16),
                      0 10px 40px -12px rgba(0,0,0,.7);
  --inset-sunken: inset 0 2px 14px rgba(0,0,0,.55);

  /* Motion — longer, eased, cinematic but never slow enough to wait on */
  --duration-instant: 90ms;
  --duration-fast: 180ms;
  --duration-normal: 320ms;
  --duration-slow: 560ms;
  --ease-standard: cubic-bezier(.3,0,.2,1);
  --ease-out-expo: cubic-bezier(.16,1,.3,1);
  --ease-in: cubic-bezier(.5,0,1,1);

  /* Interaction */
  --focus-ring-width: 2px;
  --focus-ring-offset: 3px;
  --tap-min: 44px;
}

[data-surface="studio"] {
  --color-ground: #F6F3EE;
  --color-surface: #FFFFFF;
  --color-surface-raised: #FFFFFF;
  --color-surface-sunken: #EBE6DD;
  --color-hairline: #DCD5C9;
  --color-hairline-strong: #8A8275;
  --color-text: #1A1713;
  --color-text-secondary: #4D463D;
  --color-text-muted: #645D4E;
  --color-text-oncolor: #FFFFFF;
  --color-accent: #8A5A10;
  --color-accent-hover: #744B0B;
  --color-accent-active: #5E3D08;
  --color-accent-subtle: #F3EADA;
  --color-focus: #8A5A10;
  --color-status-approved: #1E6B4F;
  --color-status-changes: #8A4B00;
  --color-status-danger: #9B1C1C;
  --color-studio-only-bg: #F1ECE1;
  --color-studio-only-border: #8A8275;
  --elevation-1: inset 0 0 0 1px var(--color-hairline);
  --elevation-2: 0 1px 1px rgba(26,23,19,.04), 0 12px 32px -10px rgba(26,23,19,.2);
  --elevation-canvas: inset 0 1px 0 rgba(26,23,19,.06);
  --inset-sunken: inset 0 1px 3px rgba(26,23,19,.08);
}
```

### Interaction states — Direction B

| State | Treatment |
|---|---|
| Rest (primary button) | brass fill, `--color-text-oncolor`, `--radius-sm`, inset top highlight `rgba(255,255,255,.18)` |
| Hover | fill → `--color-accent-hover`; a warm glow grows `0 0 0 0` → `0 6px 22px -6px rgba(216,166,87,.4)` over `--duration-fast` |
| Active | fill → `--color-accent-active`; `scale(.985)`; glow collapses |
| Focus-visible | 2px `--color-focus` (near-white) ring at 3px offset, **plus** a `#14120F` 1px inner ring so the ring reads on brass and on the white page mat alike |
| Rest (secondary/ghost) | transparent, 1px `--color-hairline-strong`, `--color-text` |
| Hover (secondary) | background `--color-accent-subtle`, border → brass |
| Disabled | `--color-text-muted`, no fill, 60% opacity border, **always with the reason in text** |
| Row hover (lists) | background lifts one surface step and the row's left label brightens to `--color-text`; `--duration-fast` |
| Work hover (thumbnail strip) | the thumbnail's own light pool intensifies (`--elevation-canvas` opacity ×1.6) — the light responds, the image does not move |
| Pin hover | 1.12× marker scale + brass glow; dark stroke and numeral unchanged |
| Link | brass, underline offset 0.2em, 1px → 2px on hover |
| Drag (reorder) | lifted row gets `--elevation-2` and a brass hairline; the gap is a dashed brass outline |
| Bottom sheet (phone) | translates from 100% → 0 with `--ease-out-expo` over `--duration-normal`; the ground behind dims by 40%, the work does not blur |

### References — what to borrow

| Reference | Borrow |
|---|---|
| **Arc / Family** (or any well-made dark-first consumer app) | How a dark app stays warm instead of grey, and how a single accent carries all intent without a second hue |
| **Apple Photos / Lightroom review mode** | The behaviour of showing an image on a dark neutral surround with chrome that recedes on idle and returns on intent — exactly the review-canvas job |
| **Phaidon / Thames & Hudson monograph layout**, or a gallery exhibition label | The plinth: a tracked small-caps label block (stage · round · date) set beneath the work, and an editorial serif title that is allowed to be large |

### Accessibility notes — Direction B
- Dark grounds have less headroom, so the dark palette is deliberately generous: primary text 16.6:1, secondary 8.8:1, muted 5.0:1, brass 8.5:1. All listed pairs clear AA; most clear AAA.
- Two hazards, both handled: (1) brass on the **white page mat** is 2.2:1 — forbidden, which is why pins use a dark stroke and dark numeral; (2) `--color-status-changes` is close in hue to brass — every status therefore carries a word and a distinct glyph, and status is never colour alone.
- The studio scope is light because long reading on a dark ground increases fatigue and because dense tables lose their hairline structure in the dark. This is a stated accessibility choice, not an aesthetic inconsistency.
- Focus ring is a double ring (near-white outer + dark inner) so it is visible on the dark ground, on brass, and on the white page mat.
- Reduced motion: all `--duration-*` → `1ms`; the glow on hover becomes a static border-colour change; the bottom sheet appears without translation; the work's light pool becomes a static shadow; no parallax, no idle-fade of the chrome (chrome stays visible permanently instead).
- The grain layer is disabled under `prefers-reduced-transparency` and `forced-colors`, and must never sit above the work.
- Forced-colors: all four surface values collapse, so the layout must not rely on surface steps alone — every panel that matters also has a border in forced-colors mode.

### What Direction B optimises for / trades away
**Optimises for:** the client's emotional first impression, especially renders and photography on a phone; perceived premium, which helps a studio charge for the presentation; the "work is the interface" principle expressed literally through light; differentiation — nobody will mistake it for a template.
**Trades away:** PDF line drawings on a white page mat inside a dark frame produce a high-contrast edge that some users find glary (mitigated by the mat inset and a warm surround, but it is a real cost). The studio/client split doubles the theme work and the visual-regression matrix. Accessibility needs more care and more CI enforcement. Font payload is larger (two variable families, one with optical sizing). Dense studio tables are harder to make feel at home in this system. And executed carelessly it becomes "default dark mode with a gold button", which is worse than Direction A executed carelessly.

---

## Recommendation

**Direction A — "Drawing Set"**, for Phase 1.

Reasoning:
1. **The riskiest screen is the PDF canvas, not the render.** The pilot's work is architectural drawing sets (§10.1 step 4 is a PDF plus images). Line drawings are authored on white and judged on white. A's near-white ground is the correct instrument for the product's hardest viewing task; B has to defend against its own ground there.
2. **Approval evidence is the product's proof.** P13 must read as a record. A's mono metadata and title-block system make that convincing almost for free; B needs invented apparatus to do the same.
3. **Accessibility and CI cost.** A has the most contrast headroom and one theme; B has two scopes, a pin-on-white hazard and a hue collision, all of which need enforcement in a 6–8 week Phase 1A (B9).
4. **Agent-built reliability.** A's character lives in hairlines, tone steps and tracked labels — cheap, token-driven and hard for a builder to accidentally break. B's character lives in layered light, glow and grain, which degrade quietly when implemented inattentively.
5. **The trade is recoverable.** If pilot studios say the client experience feels cold, B's presentation move is additive: a dark surround plus a plinth for the review canvas only, as a second theme scope, without touching the studio side.

If the product owner's priority is instead **selling the presentation** — pitching ProofDesk on how the client's phone looks when the render opens — pick **B**, and budget an extra visual-regression and contrast pass plus a real-device PDF legibility check in the week-1 viewer spike that ADR-0002 already requires.
