# Wireframe — Client submission review canvas (C4 / C5 / C6)

**Status:** Draft — awaiting product owner selection (B8)

Low fidelity: layout, hierarchy and region behaviour only. No colour, no final copy. Direction-neutral — both visual directions use this skeleton.
Companion states: [interface-states.md](../interface-states.md) §A.

---

## Layout intent

- **The work takes the majority of the viewport at every breakpoint.** Target: ≥68% of viewport area on desktop, ≥62% on phone with the sheet closed.
- **Three regions, fixed roles:** the *plinth* (what is this and what's being asked), the *stage* (the work + pins), the *response* (threads + decision). On desktop the response is a right rail; on phone it is a bottom sheet.
- **Not a uniform card grid.** The stage is a single sunken well; the plinth is an overlapping block; the file strip is a horizontal filmstrip. Nothing on this screen is a card in a 3-column grid.
- **Hierarchy by scale contrast:** the file fills the stage, the submission title is `--text-title`, everything else is `--text-sm`/`--text-label`. There is exactly one primary action visible at a time.

---

## Desktop — verified reviewer, nothing selected (≥1280 px)

```
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ STUDIO NAME                          Villa Marine · Round 2                 jane@…  (R) ⌄  │ 56px app bar
├───────────────────────────────────────────────────────────────────────────────────────────────┤
│  SCHEMATIC DESIGN · ROUND 2 · DUE 2 DEC            ← tracked label row (--text-label)         │
│  Revised layout — kitchen island                   ← --text-title                             │
│  "Please confirm the island position and the       ← the ask, --text-base, max 68ch            │
│   worktop material." · Instructions ⌄  (collapsed) ← disclosure, collapsed by default          │
├──────────────────────────────────────────────────────────────────┬────────────────────────────┤
│                                                                  │ FEEDBACK          3 open   │
│   ┌────────────────────────────────────────────────────────────┐ │ ┌────────────────────────┐ │
│   │                                                            │ │ │ ① CHANGE REQUEST   open│ │
│   │                                                            │ │ │ Jane · 2h               │ │
│   │                   ① ← pin marker                           │ │ │ "Island feels tight…"  │ │
│   │        THE WORK (page mat, true white)                     │ │ │ GF Plan v2 · p.1    →  │ │
│   │        PDF page or image, fit-to-width                     │ │ ├────────────────────────┤ │
│   │                                       ②                    │ │ │ ② QUESTION         open│ │
│   │                                                            │ │ │ Tom · 1h                │ │
│   │                                                            │ │ │ "Is this the same…"    │ │
│   └────────────────────────────────────────────────────────────┘ │ ├────────────────────────┤ │
│      ↑ sunken canvas well (--color-canvas-mat, --inset-sunken)   │ │ ③ PREFERENCE   resolved│ │
│                                                                  │ │ collapsed, still readable││
│   ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐    ← filmstrip, current outlined  │ └────────────────────────┘ │
│   │1●││2 ││3 ││4 ││5 ││6 ││7 │      dot = has comments           │                            │
│   └──┘└──┘└──┘└──┘└──┘└──┘└──┘                                   │ ┌────────────────────────┐ │
│                                                                  │ │ + Add a general note   │ │
│   [− ] [fit] [100%] [ +]   ‹ page 1 of 4 ›   ⤓ Download original │ └────────────────────────┘ │
├──────────────────────────────────────────────────────────────────┴────────────────────────────┤
│  ⊕ Add comment on this file                        Request changes      ▸ Approve this submission │ 72px action bar
└───────────────────────────────────────────────────────────────────────────────────────────────┘
      ↑ armed-mode entry (not long-press)            ↑ secondary        ↑ primary, approver only
```

Region widths: stage `1fr`, response rail `clamp(320px, 26vw, 400px)`. Below 1024 px the rail collapses to a right-edge drawer toggled by a "Feedback (3)" button in the action bar.

### Desktop — thread selected

```
│                                                  │ ┌────────────────────────────────────────┐ │
│          ①  ← selected pin: ring + lifted        │ │ ‹ Back to all feedback                 │ │
│          ↑ canvas auto-scrolls + zooms to pin    │ │ CHANGE REQUEST · open                  │ │
│                                                  │ │ GF Plan v2 · page 1                    │ │
│                                                  │ │                                        │ │
│                                                  │ │ Jane Doe · 22 Nov 14:02 (GMT+5)        │ │
│                                                  │ │ "Island feels tight against the…"      │ │
│                                                  │ │                                        │ │
│                                                  │ │ Studio Name · 22 Nov 16:40             │ │
│                                                  │ │ "We can shift it 150mm. Here's…"       │ │
│                                                  │ │                                        │ │
│                                                  │ │ ┌────────────────────────────────────┐ │ │
│                                                  │ │ │ Write a reply…                     │ │ │
│                                                  │ │ └────────────────────────────────────┘ │ │
│                                                  │ │                             [ Reply ]  │ │
│                                                  │ └────────────────────────────────────────┘ │
```

No `Included / Potential scope change` control. No resolve control. Both are studio-only.

### Desktop — pin placement armed

```
├──────────────────────────────────────────────────────────────────────────────┤
│  ⌖ Click the drawing where you want to comment        Esc to cancel          │ hint bar replaces action bar
├──────────────────────────────────────────────────────────────────────────────┤
│   stage: crosshair cursor, pin draft is draggable until posted               │
│   on drop → composer opens in the rail:                                      │
│       TYPE   ( ) Question  ( ) Change request  ( ) Preference  ( ) Concern    │  ← required
│       ┌──────────────────────────────────────┐                               │
│       │ What should the studio know?         │                               │
│       └──────────────────────────────────────┘                               │
│       Visible to the studio and everyone invited to this review.             │  ← no privacy implied
│       [ Cancel ]                                   [ Post comment ]          │  ← disabled until type chosen
```

### Desktop — approval sheet (C6, approver only)

```
        ┌──────────────────────────────────────────────────────────────┐
        │ Approve this submission                                   ✕  │
        ├──────────────────────────────────────────────────────────────┤
        │ SCHEMATIC DESIGN · ROUND 2 · Revised layout — kitchen island │
        │                                                              │
        │ You're approving these 4 files, exactly as shown:            │
        │   1  Ground floor plan        v2   4 pages                   │
        │   2  Elevations               v2   2 pages                   │
        │   3  Render A                 v1                             │
        │   4  Render B                 v1                             │
        │                                                              │
        │ Recorded as  jane@example.com (verified)                     │
        │                                                              │
        │ ┌──────────────────────────────────────────────────────────┐ │
        │ │ Add a note (optional)                                    │ │
        │ └──────────────────────────────────────────────────────────┘ │
        │                                                              │
        │ This records your approval of this submission only. It       │
        │ doesn't approve later versions, and it isn't a contract or    │
        │ a signature.                                                 │
        ├──────────────────────────────────────────────────────────────┤
        │ [ Cancel ]                         [ Approve this submission ]│
        └──────────────────────────────────────────────────────────────┘
```

---

## Phone — 375 px, verified reviewer, sheet closed

The default screen a client sees (§10.1 step 5). Chrome totals 148 px; the work gets the rest.

```
375px
┌─────────────────────────────────────────┐
│ ◆ Studio Name              jane@…  (R) ⌄│  48  app bar, project name on tap
├─────────────────────────────────────────┤
│ SCHEMATIC DESIGN · R2 · DUE 2 DEC       │  44  plinth, collapsed
│ Revised layout — kitchen island      ⌄  │      tap ⌄ → ask + instructions expand
├─────────────────────────────────────────┤
│                                         │
│   ┌─────────────────────────────────┐   │
│   │                                 │   │
│   │               ①                 │   │
│   │                                 │   │
│   │        THE WORK                 │   │  ≈430  fit-to-width, pinch to zoom,
│   │   (page mat, true white)        │   │        double-tap to toggle fit/100%
│   │                      ②          │   │
│   │                                 │   │
│   │                                 │   │
│   └─────────────────────────────────┘   │
│   ‹  1 of 4   ›        2 comments ●     │  36  pager + off-screen pin hint
│   ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐              │  56  filmstrip, horizontally scrollable
│   │1●││2 ││3 ││4 ││5 ││6 │              │      44px min touch height
│   └──┘└──┘└──┘└──┘└──┘└──┘              │
├─────────────────────────────────────────┤
│  ⊕ Comment      💬 Feedback 3     ⋯     │  64  action bar, safe-area padded
└─────────────────────────────────────────┘
   ↑ arms pin mode   ↑ opens sheet   ↑ decision + download + instructions
```

`⋯` opens: **Approve this submission** (approver only) · **Request changes** · Download original · Review instructions · Signed in as jane@…

### Phone — feedback sheet open (≤55% viewport)

```
┌─────────────────────────────────────────┐
│ ◆ Studio Name                      ⌄    │
├─────────────────────────────────────────┤
│   ┌─────────────────────────────────┐   │  work stays visible; the selected pin
│   │               ①  ← kept visible │   │  is scrolled into this band when the
│   │                                 │   │  sheet opens
│   └─────────────────────────────────┘   │
├═════════════════════════════════════════┤  ← drag handle, swipe down to close
│ FEEDBACK                   3 open   ✕   │
│ [ All ] [ Open ] [ Resolved ]           │
│ ─────────────────────────────────────── │
│ ① CHANGE REQUEST · open                 │
│    Jane · 2h · GF Plan v2 p.1        →  │
│    "Island feels tight against the…"    │
│ ─────────────────────────────────────── │
│ ② QUESTION · open                       │
│    Tom · 1h · GF Plan v2 p.1         →  │
│ ─────────────────────────────────────── │
│ ③ PREFERENCE · resolved by Studio    ⌄  │
│ ─────────────────────────────────────── │
│ + Add a general note                    │
└─────────────────────────────────────────┘
```

### Phone — unverified state

```
┌─────────────────────────────────────────┐
│ ◆ Studio Name                           │
├─────────────────────────────────────────┤
│ SCHEMATIC DESIGN · R2                   │
│ Revised layout — kitchen island          │
├─────────────────────────────────────────┤
│   ┌─────────────────────────────────┐   │
│   │        THE WORK                 │   │  full view, read-only
│   │   (no pins editable)            │   │
│   └─────────────────────────────────┘   │
│   ‹  1 of 4   ›                         │
├─────────────────────────────────────────┤
│ 🔒 Verify your email to comment or       │  persistent, not dismissible
│    make a decision                      │
│          [ Send me a code ]             │  48px, full width minus gutters
└─────────────────────────────────────────┘
```

### Phone — OTP (C2)

```
┌─────────────────────────────────────────┐
│ ‹ Back                                  │
│                                         │
│ Check your email                        │  --text-title
│                                         │
│ We sent a 6-digit code to               │
│ j•••@example.com                        │  fixed — NOT an editable field
│                                         │
│   ┌──┐ ┌──┐ ┌──┐  ┌──┐ ┌──┐ ┌──┐        │  inputmode=numeric,
│   │  │ │  │ │  │  │  │ │  │ │  │        │  autocomplete=one-time-code,
│   └──┘ └──┘ └──┘  └──┘ └──┘ └──┘        │  paste fills all six
│                                         │
│ Code expires in 9:12                    │
│ Resend code (available in 0:42)         │
│                                         │
│ The code goes to the address this link   │
│ was sent to. If that isn't you, ask     │
│ Studio Name to invite you directly.      │
│                                         │
│ We verify your email so your comments    │
│ and decisions are recorded as you.       │
└─────────────────────────────────────────┘
```

### Phone — decision success receipt (C6)

```
┌─────────────────────────────────────────┐
│                                         │
│ ✓  Approval recorded                    │
│                                         │
│ Revised layout — kitchen island          │
│ Schematic Design · Round 2 · 4 files     │
│                                         │
│ Approved by jane@example.com             │
│ 24 Nov 2026, 14:02 (GMT+5)               │
│                                         │
│ A copy has been emailed to you.          │
│                                         │
│ This records your approval of this       │
│ submission only.                        │
│                                         │
│ [ Back to the work ]                    │
└─────────────────────────────────────────┘
```

Persistent in-page receipt, not a toast — this is the product's proof moment.

---

## Behaviour notes for builders

1. The stage reserves its space from snapshot metadata (page aspect ratio) before the file loads, so CLS stays at 0.
2. Pins are positioned as a percentage of the rendered page box, recomputed on zoom, pan, resize and PDF rotation. Marker **size** never scales with zoom; marker **position** always does.
3. Pin hit area is ≥44 × 44 px regardless of the drawn marker size. Pins within ~24 px cluster into a numbered group.
4. Placing a pin is an explicit armed mode entered from the action bar. Never long-press, never tap-to-pin on the bare canvas — it collides with pan and zoom.
5. The filmstrip reflects the snapshot's display order and never re-sorts.
6. The approver's decision control is visible to non-approvers with the reason stated, and is server-rejected regardless.
7. Studio-only fields do not exist in this component tree. Guest thread rendering is a separate component from studio thread rendering.
