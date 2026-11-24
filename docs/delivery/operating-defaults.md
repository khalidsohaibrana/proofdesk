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
- Parallel builders: **3** in Wave 1, raised to **5** after a wave merges cleanly (open decision A2). Never pad the count.
- Models: Opus for the supervisor, reviewer, security-reviewer and discovery agents; Sonnet for builders and QA (A2).
- Usage: no hard cap. The supervisor reports agent runs in each handoff and pauses any ticket that needs more than 3 builder runs (A3).
- New dependency licenses: MIT/Apache-2.0/BSD/ISC are pre-approved; anything else needs the human.

## Branch, commit and PR conventions (until the boilerplate defines its own)

- Branches: `<type>/<issue#>-<slug>`, e.g. `feat/12-asset-versioning`.
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `refactor:`, `ci:`).
- One ticket = one issue = one branch = one PR. The PR body uses `.github/pull_request_template.md` and links the issue (`Closes #N`) and governing ADRs.
- `main` is protected **for everyone, admins included**: changes only through PRs, with no force pushes or deletion. CI status checks become required once the bootstrap PR adds CI.
- **Supervisor doc changes also go through PRs.** Use a `docs/<slug>` branch and one PR. The supervisor may merge its own docs-only PR when it touches only docs-only paths. Docs that need human acceptance (SRS, Proposed ADRs) still need the human's acceptance before they're marked Accepted.
- **Verdicts are PR comments, not GitHub approvals.** Every agent and the human push as one GitHub account (`khalidsohaibrana`), and GitHub won't let a PR author approve their own PR. So branch protection requires **0 GitHub approvals**, and the gate is the supervisor checking for the fixed-format verdict comments (`REVIEW:`, `SECURITY:`, `QA:`) posted after the latest commit. The human's production approval is given **in the supervisor session in the human's own words**, never taken from a PR comment, because any agent could post a comment as the shared account. The supervisor then records it on the PR as `HUMAN APPROVAL RECORDED: <quote, date>`.
- Labels: `lane:frontend`, `lane:backend`, `lane:full-stack`, `lane:infra`, `migration`, `security-review`, `needs-human`, `blocked`, `phase-0`.

## Approved by the product owner on 2026-11-21 (see `open-decisions.md`)

- **Environments (B1, amends #4):** local only for now. Docker Compose provides Postgres, **SeaweedFS** (S3-compatible), ClamAV and Mailpit. No cloud deploys and no paid services until a hosting ADR is accepted. *Amended 2026-11-24: MinIO replaced by SeaweedFS, per ADR-0002's second amendment.*
- **Agent identity (A1):** a separate review bot GitHub account posts reviewer, security and QA verdicts. Once it exists, `main` requires 1 GitHub approval from it.
- **Questions (A4):** batched into one decision request per session.
- **Handoff (A5):** `docs/delivery/status.md` is updated every session.
- **Governance (A6):** changes to `agent-system/**`, `.claude/settings.json` and `CLAUDE.md` need the human's approval. The supervisor proposes but never merges them.
- **Command deny-list (A7):** in `.claude/settings.json`. It is a safety net, not a sandbox: agents must still follow the rules.
- **Tools (A8):** `gh`, git, project commands, browser/Playwright (QA), Context7 docs. Figma is allowed for `ux-designer` only. Personal connectors are denied in `settings.local.json`.
- **Evidence (A9):** screenshots and short videos attached to PRs; longer videos via Loom, linked from the PR.
- **Quality targets (A10):** median lead time ≤ 2 working days, ≤ 2 review rounds on average, 0 escaped invariant/security defects, < 20% of PRs needing human rework. Reviewed after Wave 2.
- **Coverage (A11):** ≥ 80% line coverage on domain/server code, enforced in CI; every invariant has a named test; UI is covered by E2E and visual checks.
- **CI (A12):** start with lint, typecheck and unit tests required; add the rest by Wave 2.
- **Product limits (B6):** 50 MB per file, 50 pages per PDF for in-browser review, 5 GB per workspace (soft limits).
- **Legal (B5):** a simple written pilot agreement with each studio.
- **UX (B8):** `ux-designer` proposes 2 visual directions; the human picks one before any UI ticket.
- **Timeline (B9):** 6–8 weeks to Phase 1A.
- **License (B10):** none (all rights reserved).
- **Deferred:** B2 cloud accounts, B3 domain, B4 region (until hosting), B7 retention, A13 demo log, B11 pilot recruitment.

## Team capacity (approved by the product owner, 2026-11-24)
- **max 7 subagents running at once**; per role max **5 builders, 1 reviewer, 1 security reviewer, 1 QA** (discovery/helper agents count toward 7). Set in `.claude/agent-system.json` → `agentLimits`, enforced by `agent-system/hooks/cap-subagents.mjs`. **More needs the human's explicit approval**; agents never edit the limits
