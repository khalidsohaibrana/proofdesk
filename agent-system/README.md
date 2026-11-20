# Agent System: supervised multi-agent software delivery

A reusable delivery system for Claude Code. A **supervisor** agent plans, gates and routes the work, parallel **builder** agents implement one ticket each in isolated git worktrees, separate **reviewer** and **QA** agents verify every PR, and a **human product owner** approves anything that goes to production.

It currently lives inside its first host project and is developed alongside it. It is kept **self-contained** so it can be pulled out as its own product.

## Boundary rule
Nothing in `agent-system/` may mention a specific project. Project facts belong in the host project's `docs/delivery/project-profile.md`. Check with:

```bash
grep -rniE "<project-name>" agent-system/ && echo "LEAK: project-specific reference" || echo "clean"
```

## Contents

| Path | Purpose |
|---|---|
| `agents/supervisor.md` | Supervisor persona: gates G0–G4, operating rules, escalation, reporting format |
| `hooks/guard-main-checkout.mjs` | Blocks code edits in the main checkout; builders work in worktrees |
| `templates/` | Ticket, QA summary, PR, ADR and project-profile templates |
| `docs/MULTI_AGENT_SYSTEM_BASELINE.md` | Roles, authority and delivery workflow |
| `install.sh` | Wires the system into a host project |

Planned: `agents/builder.md`, `agents/reviewer.md`, `agents/security-reviewer.md`, `agents/qa.md`.

## How a host project uses it

```
host-project/
├── agent-system/                  ← this folder (vendored, submodule, or plugin later)
├── .claude/agents/supervisor.md   → symlink to agent-system/agents/supervisor.md
├── .claude/agent-system.json      ← docs-only paths for the guard hook
├── .claude/settings.json          ← registers the guard hook
└── docs/delivery/
    ├── project-profile.md         ← project facts: sources of truth, invariants, scope
    ├── operating-defaults.md      ← project's process decisions
    └── decision-log.md
```

```bash
agent-system/install.sh            # from the host project root
claude --agent supervisor
```

## Extracting it later
1. Move this folder to its own repository (for example with `git subtree split --prefix=agent-system`, which keeps its history).
2. Bring it back into each project as a git submodule at `agent-system/`, or package it as a Claude Code plugin.
3. Projects keep their own `docs/delivery/` files untouched.
