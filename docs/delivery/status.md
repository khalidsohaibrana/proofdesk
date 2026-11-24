# Delivery Status (session handoff)

The supervisor reads this first in every session and updates it before every session ends.

**Last updated:** 2026-11-24, by the first supervisor session

## Current gate
**Phase 0, Foundation (G0 not passed).** No feature code yet.

| G0 evidence | State |
|---|---|
| SRS accepted by the human | 🟡 Drafted (`product/SRS.md`, merged as Draft). 2 blocking questions left: SRS OQ-8, and ADR-0003's OQ-A2 |
| Stack + boilerplate ADR accepted | ✅ ADR-0002 Accepted, with two amendments (local-only; SeaweedFS replaces MinIO) |
| Domain model + authorization ADR accepted | 🟡 ADR-0003 **Proposed**. Needs a security review, then human acceptance |
| Environment / dependency plan, accounts provisioned | 🟡 Drafted (`docs/plans/environments-and-dependencies.md`). Awaiting human acceptance |
| Repo conventions + CI skeleton merged | 🟡 Conventions done, `main` protected. CI arrives with P0-6 |
| First-wave backlog | ⬜ P0-8 not started. ADR-0003 §10 already names 7 candidate tickets (F-1…F-7) |
| UX direction selected by the human (B8) | 🟡 Two directions drafted. **Human must pick A or B** before any UI ticket |
| Agent roster | ✅ P0-7 accepted 2026-11-24 |

## Done this session
- **P0-1 SRS** drafted by `product-analyst` — 94 FRs in 13 modules, 48 NFRs, all 11 steps of PK §10.1 traced, all 14 §5.4 invariants mapped to enforcing FRs. PR #5, merged as Draft.
- **P0-5 UX direction** drafted by `ux-designer` — 22 screens, 6 flows, interface-state matrices, two visual directions (A "Drawing Set", B "Lit Gallery") sharing one token contract, accessibility spec, wireframes at desktop and 375 px. PR #6, merged as Draft.
- **P0-3 ADR-0003** drafted by `solution-architect` — Status Proposed. Tenancy via a scoped query layer with Postgres RLS as a non-bypassable backstop and composite FKs; studio-only fields moved to a separate `studio` schema the guest DB role has no `USAGE` on. §9 maps all 14 invariants to mechanism + allowed-path + denied-path test. §11 states plainly that invariant 14 is append-only but **not tamper-evident against a DB administrator**.
- **P0-4 environment plan** drafted by `solution-architect` — pinned service versions with licences, `.env.example` inventory, storage/email/scan adapter interfaces, backup/restore, phone-testing approach.
- **P0-7 agent roster accepted** by the human.
- **MinIO found dead and replaced** by SeaweedFS across 4 documents (D-014).

## In flight
None. Next dispatch is the security review of ADR-0003.

## Blockers / waiting on the human
1. **SRS OQ-8 — administrative correction.** PK §4.4 permits it; §5.4.5/§7.3 call the snapshot immutable. Both the analyst and the architect refused to design it. Supervisor recommendation: **do not build it in Phase 1**. Blocks ticket F-4.
2. **ADR-0003 OQ-A2** — store a Reviewer's request-changes as an `ApprovalDecision` row with `decision_type='changes_requested'`? Recommendation: yes, one table, with a trigger restricting `approve` to the Primary Approver.
3. **Visual direction A or B** (B8). Designer and supervisor both recommend **A**. Blocks every UI ticket.
4. **Pixel's three UX blockers** — PDFs over the 50-page cap; client visibility of rounds they were not invited to; whether clients can edit their own comments (answer together with ADR-0003 OQ-A5).
5. **A1 review bot GitHub account** — needed before Wave 1 builders start, not before G0.
6. Acceptance of the SRS, ADR-0003 and the environment plan.

## Next 3 actions (supervisor)
1. Dispatch `security-reviewer` on ADR-0003 (mandatory before acceptance: tenancy, authorization, guest tokens, snapshots).
2. Get the 4 blocking human decisions above answered, then fold them into the SRS and ADR-0003.
3. P0-8: draft the Wave 1 backlog from ADR-0003 §10's F-1…F-7, with F-1 as the single hard prerequisite.

## Usage note
Agent runs dispatched this session: **4** (`product-analyst` ×1, `ux-designer` ×1, `solution-architect` ×2). Three mid-flight corrections sent by `SendMessage`. Peak concurrency 2 of 7 — well inside the cap. No builder runs yet.

## Known process defect, fixed
Docs committed to feature branches were absent from `main`'s working tree, so two agents were briefed against a file they could not read (D-019). Rule going forward: **docs land on `main` as Drafts before any dependent work is dispatched.**
