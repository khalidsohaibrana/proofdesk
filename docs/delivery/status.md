# Delivery Status (checkpoint)

The supervisor reads this first in every session and rewrites it at every checkpoint (see `agent-system/agents/supervisor.md`, "Memory and context budget"). Keep it under ~150 lines.

**Last checkpoint:** 2026-11-24, setup session (Sage memory design)

## Current gate
**Phase 0, Foundation (G0 not passed).** No feature code.

## Done
- Repo, agent system, guard hooks, templates, protected `main` (PRs #1, #2).
- ADR-0001 Accepted. ADR-0002 Accepted with amendment (local, free tools; hosting deferred).
- Open decisions A1–A13, B1–B11 answered (`open-decisions.md`).
- Agent dashboard (#3) and one-click decision answers (#4) merged.
- Reviewer, product-analyst and ux-designer on Sonnet (#7, D-011). Sage, solution-architect and security-reviewer stay on Opus.

## In flight
| Item | Owner | PR | State |
|---|---|---|---|
| P0-1 SRS draft | product-analyst (Nova) | #5 | Open, waiting on human answers (OQ-1 first) |
| P0-5 UX direction + wireframes | ux-designer (Pixel) | #6 | Open, waiting on human: direction A vs B (Pixel recommends A), 3 blockers |
| Sage memory rules | supervisor | this PR | Waiting on human merge |
| Dashboard: fresh sessions + usage meter | builder | #8 | Builder dispatched |

## Waiting on the human
1. OQ-1: can Reviewers request changes? (blocks the SRS)
2. Visual direction A vs B.
3. The four SRS defaults; the admin-correction route (Sage recommends no); Pixel's three blockers; accepting the P0-7 agent roster.
4. A1: review bot GitHub account + scoped token (verdicts stay comment-based until then).

## Next 3 actions (supervisor)
1. Bring the human OQ-1 as one decision; then the rest of the SRS batch.
2. After the SRS and UX answers: get #5 and #6 to acceptance.
3. Then P0-3: `solution-architect` drafts the domain/authorization ADR and the local environment plan (P0-4).

## Usage note
The 2026-11-24 setup session dispatched one builder (dashboard ticket). The earlier ProofDesk Pins demo cost ≈ $186 API-equivalent (34 agents, mostly Opus).
