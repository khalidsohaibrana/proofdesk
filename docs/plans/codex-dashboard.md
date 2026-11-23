# Codex dashboard plan

The user directs the delivery ecosystem through a local dashboard. The supervisor remains the primary planning agent and never writes application code. The first implementation supports supervisor conversation, a persistent ticket queue, and five concurrent builder processes in isolated Git worktrees.

## Implemented first slice

- Local dashboard server and responsive browser interface in `dashboard/`.
- Codex CLI supervisor invocation with a read-only sandbox and repository delivery context.
- Local ticket creation and persistent status.
- Builder dispatch into a dedicated branch and worktree, capped at five running sessions.
- Run output and status shown on the dashboard after completion.

## Next delivery slices

- GitHub issue and PR synchronization, including one ticket to one PR enforcement.
- Independent reviewer sessions, review findings, and a three-round limit.
- QA session, test result ingestion, recorded feature evidence, and merge gate checks.
- ADR proposal, acceptance, and ticket dependency visibility.

The existing delivery rules remain the source of truth for review and QA until those gates are represented and enforced in the dashboard.
