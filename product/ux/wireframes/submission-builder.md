# Wireframe — Submission builder (P10) and guest preview (P11)

**Status:** Draft — awaiting product owner selection (B8)

Low fidelity: layout, hierarchy and region behaviour only. Direction-neutral.
Companion states: [interface-states.md](../interface-states.md) §B.

---

## Layout intent

- **Two columns, not a wizard.** Left: the four sections (Files → Context → Recipients → Settings), all reachable at any time. Right: a sticky **publish rail** that is the single source of truth for readiness.
- **The publish rail shows unmet preconditions from the first render**, not after a failed submit. This is the main reason the builder is not a stepper.
- **The file list is the hero.** It is the densest, largest region, with explicit version chips. Everything else is a form.
- **Asymmetric rhythm:** Files gets `--space-6` of breathing room and a sunken well; Context/Recipients/Settings are tighter stacked blocks separated by hairlines. Deliberately not four equal cards.
- **Studio-only quarantine:** the round marker and allowance sit in a visually distinct, labelled, lock-marked region. This treatment is a reusable convention — see also P12.

---

## Desktop (≥1280 px)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ ProofDesk    Villa Marine ›  New submission                        Saved 14:02      Sam ⌄         │  56
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ‹ Back to project                                                                                   │
│                                                                                                     │
│ New submission · Round 2                     ← --text-title                                         │
├────────────────────────────────────────────────────────────────┬────────────────────────────────────┤
│                                                                │  PUBLISH                           │
│ ── 01 · FILES ───────────────────────────────── 4 selected ──  │  ┌──────────────────────────────┐  │  sticky rail
│                                                                │  │ Round 2 · Schematic Design   │  │  clamp(300px,24vw,360px)
│ ┌────────────────────────────────────────────────────────────┐ │  │ 4 files · 2 recipients       │  │
│ │ SELECTED  (drag to reorder — this is the client's order)   │ │  │ Due 2 Dec 2026 (GMT+5)       │  │
│ │ ⠿ 1  Ground floor plan      [v2 ⌄]  4p  Sam · 22 Nov   ✕  │ │  ├──────────────────────────────┤  │
│ │ ⠿ 2  Elevations             [v2 ⌄]  2p  Sam · 22 Nov   ✕  │ │  │ BEFORE YOU PUBLISH           │  │
│ │ ⠿ 3  Render A               [v1 ⌄]      Sam · 20 Nov   ✕  │ │  │ ✓ At least one file          │  │
│ │ ⠿ 4  Render B               [v1 ⌄]      ⏳ virus scan…  ✕  │ │  │ ✓ Title                      │  │
│ └────────────────────────────────────────────────────────────┘ │  │ ✓ One approver chosen        │  │
│   ↑ sunken well. [v2 ⌄] = exact version, never "latest"        │  │ ⏳ 1 file still being scanned │  │
│                                                                │  │ ○ What you're asking (opt.)  │  │
│ ┌────────────────────────────────────────────────────────────┐ │  ├──────────────────────────────┤  │
│ │ PROJECT FILES                        [ ⤒ Upload files ]    │ │  │ [ ◉ Preview as the client ]  │  │
│ │ ▸ Site plan              v1          not selected      +   │ │  │ [ ▸ Publish and notify     ] │  │  ← disabled, reason named
│ │ ▸ Section AA             v3          not selected      +   │ │  └──────────────────────────────┘  │
│ │ ▸ Material board.ai      —  Download only — not reviewable │ │                                    │
│ │ ▸ Old render.jpg         v1  ⚠ blocked by virus scan       │ │  ┌──────────────────────────────┐  │
│ └────────────────────────────────────────────────────────────┘ │  │ 🔒 STUDIO ONLY               │  │  ← quarantined region
│                                                                │  │ Not shown to the client      │  │     dashed border + lock
│ ── 02 · CONTEXT ─────────────────────────────────────────────   │  │                              │  │
│                                                                │  │ Review round                 │  │
│ Design stage    [ Schematic Design  ⌄ ]  ( ) custom label…     │  │ (•) Counts as included        │  │
│ Title           [ Revised layout — kitchen island            ] │  │ ( ) Additional round          │  │
│ Short context   [ We've moved the island 150mm and swapped…  ] │  │ Schematic Design: 2 of 3 used │  │
│ What we're      [ Please confirm the island position and the ] │  └──────────────────────────────┘  │
│ asking them     [ worktop material.                          ] │                                    │
│ Instructions    [ Zoom into page 1. Comment anywhere…        ] │                                    │
│                                                                │                                    │
│ ── 03 · RECIPIENTS ──────────────────────────────────────────   │                                    │
│ Reviewers can comment and request changes. The approver can    │                                    │
│ also approve.                                                  │                                    │
│          INVITE   CAN APPROVE                                  │                                    │
│   Jane Doe   [✓]      (•)      jane@example.com   primary      │                                    │
│   Tom Doe    [✓]      ( )      tom@example.com                 │                                    │
│   Ana Ruiz   [ ]      ( )      ana@example.com                 │                                    │
│   + Add a contact to this client                               │                                    │
│                                                                │                                    │
│ ── 04 · SETTINGS ────────────────────────────────────────────   │                                    │
│ Response requested by   [ 2 Dec 2026 ]  (GMT+5, your workspace)│                                    │
│ Optional. We'll remind recipients.                             │                                    │
└────────────────────────────────────────────────────────────────┴────────────────────────────────────┘
```

### Version picker, expanded

```
  ⠿ 1  Ground floor plan      [v2 ⌄]  4p
        ┌───────────────────────────────────────────────┐
        │ Choose the exact version for this submission  │
        │ (•) v2   Sam · 22 Nov 14:02 · 8.4 MB · 4p     │
        │ ( ) v1   Sam · 12 Nov 09:11 · 8.1 MB · 4p     │
        │          3 comments live on v1                 │
        │                                               │
        │ v2 is the newest. Choosing v1 is fine — the   │
        │ client sees exactly what you pick here.        │
        └───────────────────────────────────────────────┘
```

No "always use the latest version" option exists (§5.4.4).

### Publish confirmation dialog

```
        ┌────────────────────────────────────────────────────────────────┐
        │ Publish Round 2 to 2 people                                 ✕  │
        ├────────────────────────────────────────────────────────────────┤
        │ FROZEN ON PUBLISH                                              │
        │   Files        4, at these versions                            │
        │                Ground floor plan v2 · Elevations v2 ·          │
        │                Render A v1 · Render B v1                       │
        │   Order        as shown                                        │
        │   Stage        Schematic Design                                │
        │   Title        Revised layout — kitchen island                 │
        │   Recipients   Jane Doe (can approve) · Tom Doe (reviewer)     │
        │   Due date     2 Dec 2026 (GMT+5)                              │
        │                                                                │
        │ After publishing, this submission can't be edited. Changes      │
        │ mean a new submission.                                         │
        ├────────────────────────────────────────────────────────────────┤
        │ [ Cancel ]                              [ Publish and notify ] │
        └────────────────────────────────────────────────────────────────┘
```

### Published (read-only) state

```
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Round 2 · Published 24 Nov 11:40 · Awaiting response                                                │
│ ⓘ This submission is a snapshot and can't be edited. To change anything, publish a new submission.  │
│                                                   [ Duplicate into a new submission ]  [ Review inbox ] │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  (the four sections render as read-only summary blocks — no inputs, no disabled inputs)             │
│  RECIPIENTS   Jane Doe  can approve  ✉ delivered 11:40   [ Resend ]  [ Revoke access ]              │
│               Tom Doe   reviewer     ⚠ delivery failed   [ Resend ]  [ Revoke access ]              │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Guest preview (P11)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ◉ PREVIEW — not published. The client can't see this yet.                                           │
│    Viewing as  [ Jane Doe · can approve ⌄ ]      Width  [ Desktop ] [ ▣ Phone 375 ]      ✕ Exit     │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                     │
│          ┌──────────────────────────────────────────────────────────────────┐                       │
│          │  the real guest review canvas, rendered from the GUEST read      │                       │
│          │  model — decision controls present but inert and labelled        │                       │
│          │  "Disabled in preview"                                           │                       │
│          └──────────────────────────────────────────────────────────────────┘                       │
│                                                                                                     │
│ ⓘ Not visible to the client yet: nothing. (or: "Render B is still being scanned.")                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

The frame is persistent and cannot be dismissed, so a screenshot can never be mistaken for the live client view.

---

## Phone — 375 px

Studio-side, so designed desktop-first, but it must stay fully usable: a studio owner publishing a revision from a site visit is a real case. Sections become an accordion; the publish rail becomes a sticky bottom bar.

```
375px
┌─────────────────────────────────────────┐
│ ‹  New submission · R2       Saved ✓    │  48
├─────────────────────────────────────────┤
│ ▾ 01 · FILES                 4 selected │  48  accordion header, 44px+ target
│   ┌─────────────────────────────────┐   │
│   │ 1 Ground floor plan             │   │      each row 2 lines; version chip
│   │   [v2 ⌄] 4p            ⠿    ✕   │   │      is a tappable 44px control
│   ├─────────────────────────────────┤   │
│   │ 2 Elevations                    │   │
│   │   [v2 ⌄] 2p            ⠿    ✕   │   │
│   ├─────────────────────────────────┤   │
│   │ 3 Render A                      │   │
│   │   [v1 ⌄]               ⠿    ✕   │   │
│   ├─────────────────────────────────┤   │
│   │ 4 Render B                      │   │
│   │   [v1 ⌄] ⏳ scanning   ⠿    ✕   │   │
│   └─────────────────────────────────┘   │
│   Reorder: hold ⠿ and drag, or use the  │      keyboard/AT path also available
│   ▴▾ buttons that appear on focus       │
│   [ + Add files from the project ]      │
│   [ ⤒ Upload files ]                    │
├─────────────────────────────────────────┤
│ ▸ 02 · CONTEXT        Title set ✓       │  48  collapsed
├─────────────────────────────────────────┤
│ ▸ 03 · RECIPIENTS     2 · approver ✓    │  48
├─────────────────────────────────────────┤
│ ▸ 04 · SETTINGS       Due 2 Dec         │  48
├─────────────────────────────────────────┤
│ 🔒 STUDIO ONLY  Included round · 2 of 3 │  48  collapsed, lock-marked
├─────────────────────────────────────────┤
│ ⏳ 1 file still being scanned           │  40  the single top blocker
│ [ ◉ Preview ]   [ ▸ Publish        ]    │  64  sticky bottom bar, safe-area
└─────────────────────────────────────────┘
```

### Phone — recipients section expanded

```
┌─────────────────────────────────────────┐
│ ▾ 03 · RECIPIENTS                       │
│ Reviewers can comment and request        │
│ changes. The approver can also approve.  │
│ ┌─────────────────────────────────────┐ │
│ │ Jane Doe            primary contact │ │
│ │ jane@example.com                    │ │
│ │ Invite        [✓]                   │ │  each control ≥44px tall,
│ │ Can approve   (•)                   │ │  stacked — never a cramped
│ ├─────────────────────────────────────┤ │  desktop table squeezed down
│ │ Tom Doe                             │ │
│ │ tom@example.com                     │ │
│ │ Invite        [✓]                   │ │
│ │ Can approve   ( )                   │ │
│ └─────────────────────────────────────┘ │
│ Exactly one person can approve. Choosing │
│ someone else moves it.                   │
│ [ + Add a contact ]                      │
└─────────────────────────────────────────┘
```

### Phone — publish confirmation (full-screen, not a cramped dialog)

```
┌─────────────────────────────────────────┐
│ ✕                                       │
│ Publish Round 2 to 2 people             │
│                                         │
│ FROZEN ON PUBLISH                       │
│ Files      4, at these versions         │
│            Ground floor plan v2         │
│            Elevations v2                │
│            Render A v1                  │
│            Render B v1                  │
│ Order      as shown                     │
│ Stage      Schematic Design             │
│ Recipients Jane Doe (can approve)       │
│            Tom Doe (reviewer)           │
│ Due date   2 Dec 2026 (GMT+5)           │
│                                         │
│ After publishing, this submission can't  │
│ be edited. Changes mean a new           │
│ submission.                             │
│                                         │
│ [ Publish and notify ]                  │  56, full width
│ [ Cancel ]                              │
└─────────────────────────────────────────┘
```

---

## Behaviour notes for builders

1. The publish rail/bar is the **only** place readiness is communicated. No field-level red borders fired by a failed submit attempt.
2. Autosave is quiet and continuous; a save failure is a persistent rail warning plus a navigation guard, never a toast that can be missed.
3. A file that is `pending_scan` is visible and selected but blocks publish with the reason named; the block clears automatically when the scan completes, with a live-region announcement.
4. `Download only` and `blocked by virus scan` rows are unselectable — no `+` control at all, with the reason in the row.
5. Reorder has three equivalent paths: pointer drag, keyboard (`Space` to lift on the handle, arrows to move, `Space` to drop) and visible ▴▾ buttons on focus. Each announces the new position.
6. Publishing locks the UI into read-only. There is no edit affordance — not a disabled one, an absent one.
7. The studio-only region's dashed border, lock glyph and "Not shown to the client" label are a fixed convention; reuse them verbatim in P12 and P13.
8. The guest preview must render from the guest read model. Passing studio props into the preview defeats its purpose and is a review failure.
