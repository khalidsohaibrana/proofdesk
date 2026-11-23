# Codex delivery instructions

This repository uses `agent-system/` as its delivery rules and ProofDesk as its first project. Read `docs/delivery/status.md`, `docs/delivery/project-profile.md`, and accepted ADRs before planning or implementation. Explicit instructions from the human in the current session take priority.

For a supervisor session, follow `agent-system/agents/supervisor.md`. Plan, assign tickets, check gates, and unblock builders. Never write application code.

For a builder session, follow `agent-system/agents/builder.md`. Work on one ticket in an isolated branch/worktree and produce one PR. A reviewer must be a separate Codex session. The review and fix loop stops after three rounds. Tests and recorded feature evidence are required before merge, as described in `agent-system/docs/MULTI_AGENT_SYSTEM_BASELINE.md`.

The local dashboard in `dashboard/` is the first Codex interface. Its instructions are in `dashboard/README.md`. Five independent builders may run concurrently when five ready tickets exist. Do not manufacture tickets to fill capacity.
