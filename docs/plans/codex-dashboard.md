# Codex dashboard delivery

The local dashboard is the control surface for a supervisor-led development process. The supervisor plans and creates tickets. Builders use isolated branches. Reviewer and QA sessions inspect the resulting work. The dashboard records progress, evidence, run output, and gate results.

## Current implementation

- Supervisor conversation and ticket creation through a structured Codex response.
- Five concurrent builder slots, each running Codex in a separate Git worktree.
- Reviewer dispatch, findings, and a three-round limit.
- QA dispatch with a required feature recording reference.
- Live run output, ticket detail, event history, stop control, and restart recovery.
- A merge-ready state only after reviewer approval and QA pass.

## Remaining integrations

- GitHub issue and PR creation, CI status and review verification.
- Recording capture and playback within the dashboard.
- Merge control that verifies all repository gates, plus ADR acceptance status and dependency checks.
- Authentication and deployment for remote access.

Until those integrations exist, merge remains a GitHub action governed by the repository delivery rules.
