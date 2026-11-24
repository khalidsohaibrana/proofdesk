# ProofDesk UX direction — Phase 1 (P0-5)

**Status:** Draft — awaiting product owner selection (B8)
**Author:** `ux-designer` (Pixel) · **Date:** 2026-11-24
**Scope source:** `product/ProofDesk_Product_Knowledge_Multi_Agent.md` §5.4, §6, §7, §9, §10.1 and `product/ProofDesk_Phase_1_Scope_Baseline.md` §5.
**Stack constraint:** ADR-0002 (Next.js 16 App Router, React 19, Tailwind 4, shadcn/ui, react-pdf/pdf.js, react-zoom-pan-pinch).

## Documents

| File | Purpose |
|---|---|
| [screens.md](screens.md) | Every Phase 1 screen: purpose, reachable roles, data shown, required states, and the guest field boundary |
| [flows.md](flows.md) | Key flows step-by-step with the state change at each step, including failure branches |
| [interface-states.md](interface-states.md) | State matrices for the two highest-risk surfaces: review canvas and submission builder |
| [visual-direction.md](visual-direction.md) | **Two** distinct visual directions with palettes, typography, depth strategy, and a full CSS custom-property token set each |
| [accessibility.md](accessibility.md) | Keyboard paths, focus order, target sizes, contrast checks, reduced motion |
| [wireframes/review-canvas.md](wireframes/review-canvas.md) | Low-fi layout, desktop + 375 px |
| [wireframes/submission-builder.md](wireframes/submission-builder.md) | Low-fi layout, desktop + 375 px |
| [open-questions.md](open-questions.md) | `NEEDS HUMAN` items, blocking and non-blocking |

## How to use this set

1. The product owner picks **one** visual direction (operating defaults B8). Nothing in `screens.md`, `flows.md`, `interface-states.md`, `accessibility.md` or the wireframes depends on which one wins — those are direction-neutral.
2. The chosen direction's token block becomes `src/styles/tokens.css`. **Token names are identical across both directions**; only values differ. A builder can therefore start structural work before selection lands.
3. Builders must not add a screen, state, role or field that is not in `screens.md`. Anything missing is a supervisor question, not a builder decision.

## Scope discipline

This set adds no roles (Owner, Member, Reviewer, one Primary Approver only), no workflow states beyond §5.5, no entities and no permissions. Out-of-scope ideas surfaced while designing are logged in `product/future-considerations.md`, not here.
