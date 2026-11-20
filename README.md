# ProofDesk

**Your work. Their feedback. One clear workflow.**

ProofDesk lets architecture practices present design work, collect structured client feedback, manage revision rounds and record approval of the exact submission reviewed.

A supervised multi-agent system builds it: a supervisor agent plans and gates the work, parallel builder agents implement tickets, and separate reviewer and QA agents verify each PR. A human product owner approves anything going to production.

## Repository map

| Path | Contents |
|---|---|
| `product/` | Product documentation: scope, product knowledge, SRS, research, future considerations |
| `agent-system/` | **Reusable multi-agent delivery system** (supervisor, hooks, templates). Self-contained and project-neutral, so it can be extracted as its own product. See `agent-system/README.md` |
| `docs/delivery/` | ProofDesk's configuration of that system: project profile, operating defaults, decision log |
| `docs/adr/` | Architecture Decision Records |
| `docs/plans/` | Phase plans and gate checklists |
| `.claude/` | Claude Code wiring: agent symlinks into `agent-system/`, guard hook settings |
| `.github/` | PR template (CI workflows come with the boilerplate) |

## Running the supervisor

```bash
claude --agent supervisor
```

## Status

Phase 0, Foundation: defining the SRS, stack, boilerplate and environment plan. Application code has not started.
