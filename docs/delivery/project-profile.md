# Project Profile: ProofDesk

This file connects the reusable supervisor in `agent-system/` to this project. It is the only place the generic system learns ProofDesk-specific facts.

## Product
ProofDesk: an architecture-first client design review, feedback, revision and approval platform for small architecture/interior studios.

## Sources of truth (highest priority first)
1. Explicit instruction from the human in the current session.
2. `product/ProofDesk_Product_Knowledge_Multi_Agent.md`: product rules, invariants, delegation protocol.
3. `product/ProofDesk_Phase_1_Scope_Baseline.md`: Phase 1 scope and acceptance scenario.
4. `product/SRS.md` once accepted, plus Accepted ADRs in `docs/adr/`.
5. `docs/delivery/operating-defaults.md` and `agent-system/docs/MULTI_AGENT_SYSTEM_BASELINE.md`.
6. Existing repository conventions.
7. Agent recommendations (never requirements by themselves).

## Non-negotiable invariants
Product Knowledge §5.4 (data invariants 1–14) and §7 (security, privacy and trust). Quick reference: §14.

## Out of scope
Product Knowledge §9. Ideas go to `product/future-considerations.md`.

## End-to-end acceptance scenario
Product Knowledge §10.1 (11 steps).

## Current phase
**Phase 0, Foundation.** Plan: `docs/plans/phase-0-foundation.md`. No feature code until G0 passes.

## Project-specific gate evidence
- **G2:** a security review is mandatory for tickets touching guest links/OTP, tenancy, authorization, file upload/download, submission snapshots or approvals.
- **G2/G3:** an invariant-touching ticket must have tests for both the allowed and the denied path.
- **G3:** client-facing screens need evidence at phone width (375 px) as well as desktop.

## Project-specific escalation triggers
- Any change to approval, snapshot or audit-history semantics.
- Anything that would expose studio-only fields (such as scope classification) to guest endpoints.
- UI wording that could read as a legal e-signature or contract.

## Docs-only paths in the main checkout
Configured in `.claude/agent-system.json`.
