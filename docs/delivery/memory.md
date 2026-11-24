# Supervisor memory

Lasting facts the other files don't already say. One line each, newest first. Keep under ~60 lines; merge or drop the stalest when full. Don't copy what a PR, ADR or the decision log holds: link to it.

- 2026-11-24: **Token cost is the human's top constraint.** Stay lean: short hand-backs, narrow evidence checks, no screenshots or full logs in your context, low parallelism in Phase 0. Confirm before multi-agent bursts.
- 2026-11-24: The human wants Sage on Opus but cheap, via file memory and fresh sessions, not a model downgrade (D-020, D-021).
- 2026-11-24: The human prefers a clean chat: short briefings with detail behind links or expandable sections, plus one-click `decision` blocks.
- 2026-11-24: Agreed next dashboard UX ("Jarvis" Sage): collapsed briefings, artifact cards, mission/gate bar, alerts, "while you were away" digest; later optional voice (off by default) and a review inbox. Not ticketed yet.
- 2026-11-24: `.claude/agents/*.md` are symlinks to `agent-system/agents/*.md`. Edit the target.
- 2026-11-24: Dashboard: `npm --prefix agent-system/dashboard start` → http://127.0.0.1:4173 (launch config `proofdesk-dashboard`).
- 2026-11-21: All agents share one GitHub identity; verdicts are fixed-first-line PR comments (D-006).
