# ProofDesk: rules for every agent in this repo

ProofDesk is an architecture-first client design review and approval platform. Every agent (supervisor, builders, reviewer, QA) follows these rules.

## Read first
- Product rules and invariants: `product/ProofDesk_Product_Knowledge_Multi_Agent.md` (§5.4 invariants, §7 security, §9 exclusions, §14 quick reference)
- Phase 1 scope: `product/ProofDesk_Phase_1_Scope_Baseline.md`
- Requirements: `product/SRS.md` (once accepted)
- Decisions: `docs/adr/` (Accepted ADRs are binding) and `docs/delivery/decision-log.md`
- How delivery works: `agent-system/docs/MULTI_AGENT_SYSTEM_BASELINE.md`, `docs/delivery/operating-defaults.md`

## Current phase
**Phase 0, Foundation.** No feature code until gate G0 passes (see `docs/plans/phase-0-foundation.md`).

## Roles
- **Human:** product owner; final production approval; rollback.
- **Supervisor** (`.claude/agents/supervisor.md`): plans, routes and gates. It never writes application code.
- **Builders:** one ticket, one worktree/branch, one PR. Builders do not edit files outside their ticket's scope.
- **Reviewer / Security reviewer:** separate sessions from the builder. Max 3 review rounds.
- **QA:** verifies acceptance criteria with evidence; posts the QA summary.

## Hard rules
- Never read, print or commit `.env*` files or secrets. Use `.env.example`.
- No new dependency unless the ticket names it.
- Do not add roles, states, entities, permissions or features that aren't in the product docs. Put ideas in `product/future-considerations.md`.
- Tenant isolation and authorization are enforced server-side, and every such change ships with an allowed-path test and a denied-path test.
- Never claim something is done, green or verified without the evidence (command output, CI link, screenshot).
- Conventions: see `docs/delivery/operating-defaults.md` (branches, Conventional Commits, PR template).
