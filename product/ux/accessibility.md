# Accessibility — Phase 1

**Status:** Draft — awaiting product owner selection (B8)

Target: **WCAG 2.1 AA**, with AAA text contrast where the palette allows. Scope Baseline §7 requires keyboard navigation, visible focus, readable contrast and labelled controls. Accessibility is part of both visual directions, not a later pass (contrast and reduced-motion specifics per direction are in `visual-direction.md`).

Enforcement: axe-core in Playwright on every screen in `screens.md` (ADR-0002 testing row, A11/A12), plus the manual checks at the end of this document.

---

## 1. Keyboard paths

### Global
| Key | Behaviour |
|---|---|
| `Tab` / `Shift+Tab` | Move through the focus order below. Nothing is reachable by pointer only. |
| `Enter` / `Space` | Activate. Native `<button>`/`<a>` only — no `div` with a click handler anywhere. |
| `Esc` | Close the topmost layer: pin-draft → composer → sheet → dialog. Never closes a dialog that has unsaved text without confirming. |
| `Skip to content` | First focusable element on every page. On the review canvas it offers two targets: **Skip to the work** and **Skip to feedback**. |
| Roving tabindex | Used inside the filmstrip, the thread list and radio groups, so these are one tab stop with arrow-key traversal. |

No single-character shortcuts in Phase 1 (they break screen-reader and voice input), so WCAG 2.1.4 is satisfied by not creating the problem.

### Client review canvas (C4/C5) — the critical path
Focus order, with the sheet closed:

1. Skip links (to the work / to feedback)
2. App bar: studio name, identity menu
3. Plinth: stage/round/due text (not focusable), submission title heading `h1`, instructions disclosure button
4. **The work region** — `role="group"`, `aria-label="Ground floor plan, version 2, page 1 of 4"`, `tabindex="0"`
   - `←` / `→` previous / next PDF page (or previous / next file for images)
   - `+` / `−` zoom in / out, `0` fit to width, `1` 100%
   - Arrow keys with the canvas focused and zoom > fit: pan
   - `Tab` from the work region enters the pin list, not the pan controls
5. **Pin list** — pins are real `<button>`s in DOM order matching comment order, each labelled `"Comment 1, change request, open, by Jane Doe, on page 1"`. `Enter` opens the thread. Pins are **not** reachable only by clicking the canvas.
6. Zoom / page controls, download original
7. Filmstrip — roving tabindex, `←`/`→` to traverse, `Enter` to open; each item labelled `"File 2 of 7, Elevations version 2, 2 comments"`
8. Action bar: Add comment → Feedback (n) → Request changes → Approve this submission
9. Feedback rail / sheet when open: `Esc` to close, focus trapped while it is modal on phone, not trapped when it is a side rail on desktop

**Full keyboard-only comment path (must pass in E2E):**
`Tab` to "Add comment" → `Enter` (arms placement) → because pointer placement is unavailable, an **alternative placement control appears**: a 3×3 coarse-position grid plus arrow-key nudging of the draft pin, with a live position readout ("centre, 52% across, 38% down") → `Enter` to drop → focus moves to the category radio group → arrows to choose → `Tab` to the body → type → `Tab` to Post → `Enter`.
This alternative placement path is **required**, not optional. Pin placement must not be a pointer-only capability (WCAG 2.1.1, 2.5.7).

### OTP (C2)
- Six inputs behave as one field: typing advances, `Backspace` on an empty box moves back, paste of six digits fills all, `autocomplete="one-time-code"` enables OS autofill.
- Also accepts a single paste into any box.
- `aria-describedby` carries the expiry countdown and the attempts-remaining message.
- The countdown is announced at 60 s and 10 s only (`aria-live="polite"`), never on every tick.

### Submission builder (P10)
- Section headers are `<h2>` with real disclosure buttons on phone.
- **Reorder without a pointer:** focus a drag handle → `Space` lifts ("Ground floor plan, grabbed, position 1 of 4") → `↑`/`↓` moves ("position 2 of 4") → `Space` drops → `Esc` cancels and restores. Visible ▴▾ buttons appear on focus as a second path.
- Version pickers are native-semantics listboxes/radio groups, labelled `"Version for Ground floor plan"`.
- "Can approve" is a single radio group named `"Who can approve this submission"` — one-of-many is expressed by the control, so no error message is needed.
- The publish rail is an `aria-live="polite"` region: readiness changes (scan finished, approver chosen) are announced once, debounced to at most one announcement per 2 s.
- Disabled publish must expose **why** via `aria-describedby`, never a bare `disabled`.

### Studio review inbox (P12)
- Thread list is a listbox with roving tabindex; `Enter` opens a thread and moves focus into it; `Esc` returns focus to the originating list item (focus restoration is mandatory, not best-effort).
- Opening a thread scrolls and zooms the canvas; that change is announced ("Showing comment 1 on Ground floor plan version 2, page 1").
- The studio-only region is a `<fieldset>` with a `<legend>` reading "Studio only — never shown to the client", so the warning is in the accessible name of every control inside it, not only in a visual badge.

### Dialogs and sheets
- `role="dialog"` `aria-modal="true"`, labelled by its heading.
- Focus moves to the dialog heading on open and **returns to the trigger** on close.
- Focus trapped while open; `Esc` closes unless there is unsaved text (then confirm).
- Phone bottom sheets are modal dialogs with a visible drag handle **and** a real close button, because swipe-to-dismiss is not an accessible-only path.

---

## 2. Focus treatment

- **Always visible.** `:focus-visible` only — never `outline: none` without a replacement, and never a focus style that relies on colour change alone.
- **Double ring, both directions:** an outer ring in `--color-focus` at `--focus-ring-width` with `--focus-ring-offset`, plus a 1px inner ring in the opposing value (white in Direction A, `#14120F` in Direction B). This guarantees ≥3:1 on every surface the ring can land on, including accent fills and the white page mat under a pin.
- Focus ring must never be clipped by `overflow: hidden` — offsets are accounted for in container padding.
- Focused elements inside scroll containers are scrolled into view with `scroll-margin` set, so the app bar and the action bar never cover the focused control.
- `:focus-visible` on the work region shows the ring on the page mat's border, not over the drawing.

---

## 3. Touch targets and pointer

| Element | Rule |
|---|---|
| Any interactive control | ≥44 × 44 px (`--tap-min`), enforced by hit area, not by visual size |
| Pins | drawn ~16 px, hit area 44 px; overlapping pins within ~24 px cluster into one labelled group |
| Filmstrip items | ≥44 px tall with ≥8 px gaps |
| Action-bar buttons | ≥48 px tall, full-width primary on phone, safe-area inset padding (`env(safe-area-inset-bottom)`) |
| OTP boxes | ≥44 × 48 px each |
| Spacing between adjacent targets | ≥8 px, so WCAG 2.5.8 (24 px) is exceeded |
| Dragging | always has a non-drag equivalent (WCAG 2.5.7): reorder buttons, pin nudge keys |
| Pinch-zoom | never disabled; no `user-scalable=no`, no `maximum-scale` (WCAG 1.4.4) |
| Pin placement | explicit armed mode, not long-press — long-press collides with pan and with AT gestures |

---

## 4. Contrast checks

Per-direction values and ratios are tabulated in `visual-direction.md`. Rules that bind both:

| Requirement | Rule |
|---|---|
| 1.4.3 body text | ≥4.5:1. Lowest token in either direction is `--color-text-muted` at 4.9:1 |
| 1.4.3 large text (≥24 px / 19 px bold) | ≥3:1 — satisfied with headroom by `--color-text` and `--color-text-secondary` |
| 1.4.11 non-text | ≥3:1 for control boundaries, focus rings, status glyphs, pins and chart-like marks. `--color-hairline-strong` is 3.3:1 in both directions; `--color-hairline` is decorative and never a control's only boundary |
| 1.4.1 colour alone | Every status carries a **word and a distinct glyph**: draft, published, approved ✓, changes requested ↺, revoked/blocked ⊘. Open vs resolved threads differ in label, glyph and layout, not only pin colour. Category chips are labelled text |
| Over the work | No text is ever placed directly on a drawing or render. Pin numerals sit on an opaque fill with a contrasting stroke (brass fill + dark stroke in Direction B; accent fill + white numeral + white ring in Direction A) |
| 1.4.12 text spacing | No fixed-height text containers; all copy survives line-height 1.5, letter-spacing 0.12em, word-spacing 0.16em, paragraph spacing 2em |
| 1.4.10 reflow | No horizontal scrolling at 320 px width / 400% zoom, except the filmstrip and wide PDFs, which are legitimate 2-D content |
| Dark-mode hazard (Direction B) | Brass on the white page mat is 2.2:1 and is **forbidden** there; the dark pin stroke and numeral are mandatory |

---

## 5. Reduced motion

`@media (prefers-reduced-motion: reduce)` behaviour, both directions:

| Motion | Reduced behaviour |
|---|---|
| All `--duration-*` tokens | collapse to `1ms` via the token override, so no component needs its own query |
| Pin settle after posting | instant appearance; the posted state is announced instead |
| Canvas scroll/zoom to a selected pin | instant jump, not animated pan (`scroll-behavior: auto`) |
| Bottom sheet | appears without translation |
| Row-hover accent rule (A) / warm glow (B) | becomes an immediate colour or border change |
| Drag lift | keeps the elevation change, drops rotation and translation |
| Upload / publish progress | determinate progress bars keep advancing (they convey state, not decoration) but lose indeterminate shimmer; skeletons become static blocks |
| Grain / atmosphere (B) | retained (static, non-animated); disabled under `prefers-reduced-transparency` |
| Chrome idle-fade (B) | disabled — the chrome stays permanently visible |
| User-driven zoom and pan | **unchanged** — it is user-initiated, not decorative |

No motion in ProofDesk is required to understand state, and nothing auto-plays, auto-scrolls or loops (WCAG 2.2.2 satisfied by absence).

---

## 6. Screen-reader semantics

- One `<h1>` per page: the submission title on the canvas, the project name on P7, the screen name elsewhere. Heading levels never skip.
- Landmarks on every page: `<header>`, `<nav aria-label>`, `<main>`, `<aside aria-label="Feedback">`, `<footer>`.
- The work region is a labelled `group` whose accessible name carries file name, version, page position and comment count. A PDF page is not presented as a meaningless `<canvas>`.
- **Text alternatives for the work:** a drawing cannot be auto-described. The accessible name therefore carries the studio-authored filename plus the submission's context and instructions, and the "Download original" control is always available so an assistive-technology user can open the file in their own tool. **See open question 6** on whether the studio should be prompted for a short per-file description.
- `aria-live="polite"` regions: publish-readiness rail, upload progress summary, comment posted/failed, scan status, OTP attempts remaining, thread resolved. One region per concern, debounced, never chatty.
- `aria-live="assertive"` only for a failed decision or lost access — outcomes where silence would mislead.
- Every form control has a visible persistent `<label>`. Placeholders are examples, never labels.
- Errors: `aria-invalid`, `aria-describedby` pointing at the message, message adjacent to the field, and an error summary at the top of long forms (the brief) with links to each field.
- Required vs optional is stated in words. The brief marks optional fields explicitly, because a client filling it has no context for conventions.
- Decision receipts are rendered in the page and announced, never only as a toast.

---

## 7. Language and content accessibility

- Guest copy targets a non-expert homeowner: short sentences, no jargon, no product-internal vocabulary ("snapshot", "asset version", "round" appear only where they are explained).
- Dates are written out (`2 Dec 2026`) with the timezone offset on anything decision-related. Never bare `12/02/26`.
- Abbreviations are avoided rather than marked up.
- Error messages name the cause and the next step. "Something went wrong" is not acceptable copy.
- `lang="en"` set; no other locale in Phase 1 (i18n stripped per ADR-0002).

---

## 8. Required manual checks (axe cannot catch these)

Evidence attached per PR (A9); client-facing screens need 375 px evidence (G3):

1. Complete the **full guest flow keyboard-only** on desktop: link → OTP → view → place a pin → comment → reply → approve. No pointer.
2. Complete the **full guest flow with VoiceOver on iOS Safari at 375 px**, including placing a pin and reading an existing thread.
3. Complete the flow at **400% browser zoom** at 1280 px — no content loss, no horizontal scroll outside the filmstrip and the drawing.
4. Verify **focus is never lost or reset to `<body>`** after: posting a comment, resolving a thread, closing a sheet, a failed submit, a publish, or a revocation mid-session.
5. Verify the **chosen direction's focus ring is visible on the white page mat**, on an accent fill, and over a dark render.
6. Verify **reduced-motion**: toggle the OS setting and confirm the canvas jump, pin posting, sheet and hover treatments are all static.
7. Verify **status is understandable in greyscale** on P6, P7, P12 and P13 (screenshot converted to greyscale).
8. Verify **forced-colors / high-contrast mode** on P6, P10, P12 and C4: panels keep borders, the studio-only region keeps its dashed border, focus remains visible.
9. Verify the **studio-only region's legend** is read aloud before the classification control by a screen reader.
10. Verify a real large A1/A0 PDF on a real iPhone (the viewer spike ADR-0002 already requires) for legibility at default zoom and for pin accuracy after rotation.
