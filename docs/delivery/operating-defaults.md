# Operating Defaults

**Status:** Active defaults, adopted 2026-11-21 so work can start. Each item is open to revision; the supervisor raises a revision with the human when one starts to matter.
Resolves the "Decisions still needing human attention" list in [MULTI_AGENT_SYSTEM_BASELINE.md](../../agent-system/docs/MULTI_AGENT_SYSTEM_BASELINE.md).

| # | Topic | Default | Who decides changes |
|---|---|---|---|
| 1 | Tooling | **Harness:** Claude Code. The supervisor runs as the main session (`claude --agent supervisor`) because only the main session can dispatch other agents. Builders run as separate sessions or subagents, each in its own git worktree. **Code host / PRs / CI:** GitHub (`khalidsohaibrana/proofdesk`) + GitHub Actions. **Tracker:** GitHub Issues + one GitHub Project board (it sits next to the PRs and every agent can reach it with `gh`). ClickUp is optional, as a read-only mirror for stakeholders. | Human |
| 2 | Sensitive changes outside production | **Schema migrations** in dev/preview: supervisor review before merge; the PR must label them `migration`. **Infrastructure, secrets/env config, customer/personal data, billing, destructive data operations:** human approval in every environment. | Human |
| 3 | Lockfiles, schemas, CI | **New/upgraded dependencies:** must be named in the ticket (supervisor approval *before* editing). **Lockfile, schema and CI workflow diffs:** supervisor approval *before merge*. **Removing or weakening a CI check:** human approval. | Supervisor; human for weakening checks |
| 4 | Environments & access | Local → CI → Preview (per-PR) → Production. Agents may deploy to **preview** only. **Production** deploys only after explicit human approval; then the supervisor merges/deploys. Agents never read `.env*`, production credentials or secret stores. Only `.env.example` is committed. The human creates all third-party accounts and keys. | Human |
| 5 | Release & monitoring | After every production deploy: automated smoke test of sign-in + guest review page, error-tracker watch for 24 h, uptime check. The supervisor coordinates an incident: it stops rollout, alerts the human with evidence and recommends roll back or fix forward. The **human decides rollback**. | Human |
| 6 | Reporting & waiting | Status lives in GitHub Issues/PRs. The supervisor reports to the human in the session using the standard STATUS block. While waiting on the human: a **blocking** question pauses only the affected ticket, and independent tickets continue. Production approval is always blocking. | Human |
| 7 | ADR acceptance | Supervisor accepts purely technical ADRs within accepted constraints. **Human accepts** ADRs that affect product behavior, UX, cost, security or data handling, plus the tech-stack ADR. | — |
| 8 | Success measures | Track, with no targets yet: ticket lead time (ready → merged), review rounds per PR, escaped defects/rollbacks, human escalations, % of tickets merged without human rework. Revisit targets after Wave 2. | Human |

## Agent limits

- Review→fix rounds: max **3** per PR, then escalate.
- Stuck builder: **2** failed attempts at the same failure → pause and report.
- PR size guide: under ~400 changed lines excluding generated files/lockfiles; split otherwise.
- Parallel builders: up to **5** while there are at least 5 independent ready tickets. Never pad the count.
- New dependency licenses: MIT/Apache-2.0/BSD/ISC are pre-approved; anything else needs the human.

## Branch, commit and PR conventions (until the boilerplate defines its own)

- Branches: `<type>/<issue#>-<slug>`, e.g. `feat/12-asset-versioning`.
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`, `ci:`).
- One ticket = one issue = one branch = one PR. The PR body uses `.github/pull_request_template.md` and links the issue (`Closes #N`) and governing ADRs.
- `main` is protected: PRs only, CI required, at least one approval.
