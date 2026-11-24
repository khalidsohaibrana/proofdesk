# Decision & Assumption Log

Short entries for decisions and working assumptions that don't warrant a full ADR. Append only: to change an entry, add a new one that references it.

| ID | Date | Type | Decision / assumption | Made by | Status |
|---|---|---|---|---|---|
| D-001 | 2026-11-21 | Decision | Adopted the operating defaults in `operating-defaults.md` so Phase 0 can start | Human | Active |
| D-002 | 2026-11-21 | Decision | Product documentation lives in `product/`; the reusable multi-agent system lives self-contained in `agent-system/` (extractable as its own product); ProofDesk-specific delivery config lives in `docs/delivery/`; ADRs live in `docs/adr/` | Human | Active |
| D-003 | 2026-11-21 | Decision | No feature development before Gate G0 (SRS, stack, boilerplate, domain/auth model, env plan accepted) | Human | Active |
| D-004 | 2026-11-21 | Decision | Builder, reviewer, security-reviewer and QA agent definitions drafted in `agent-system/agents/` | Supervisor setup | Awaiting human acceptance |
| D-005 | 2026-11-21 | Decision | Commits authored as `khalidsohaibrana` (GitHub noreply email); the first two commits remain under the earlier author because rewriting pushed history needs a force push | Human | Active |
| D-006 | 2026-11-21 | Decision | Branch protection on `main` with 0 required GitHub approvals; agent verdicts are fixed-format PR comments checked by the supervisor (single shared GitHub identity) | Human (setup instruction) | Active |
| D-007 | 2026-11-21 | Decision | Branch protection on `main` is enforced for admins; every change, including supervisor docs, lands through a PR | Human | Active |
| D-008 | 2026-11-21 | Decision | Open decisions A1–A13 and B1–B11 answered by the human in the session; recorded in `open-decisions.md` and `operating-defaults.md` | Human | Active |
| D-009 | 2026-11-21 | Decision | ADR-0002 accepted with amendment: boilerplate + app stack accepted; run locally with free tools; hosting deferred to a future ADR | Human | Active |
| D-010 | 2026-11-21 | Decision | Command deny-list and personal-connector deny rules added (A7, A8) | Human | Active |
| D-011 | 2026-11-24 | Decision | To cut token cost, the reviewer, product-analyst and ux-designer move from Opus to Sonnet. The supervisor (Sage), solution-architect (ADRs) and security-reviewer stay on Opus. HUMAN APPROVAL RECORDED: "All but Sage", 2026-11-24 | Human | Active |
