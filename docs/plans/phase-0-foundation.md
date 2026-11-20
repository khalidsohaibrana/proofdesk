# Phase 0: Foundation plan (Gate G0)

**Goal:** Establish what is being built, with what, and how, before any feature code. Phase 0 ends when every item below is ✅ and the human has accepted the items marked 👤.

| # | Deliverable | Output | Owner (does the work) | Accepts | Status |
|---|---|---|---|---|---|
| P0-1 | **SRS:** numbered functional requirements (FR-…) traced to scope sections, non-functional requirements (security, performance, accessibility, mobile, retention), acceptance criteria per module, traceability to the 11-step acceptance scenario. Keep it thin: reference the scope docs, don't rewrite them. | `product/SRS.md` | Supervisor (with a product/requirements subagent) | 👤 Human | ⬜ |
| P0-2 | **Stack + boilerplate decision:** compare maintained boilerplates, pick one to fork, list what to strip out, name the core libraries (auth, DB/ORM, storage, PDF viewer, jobs, email, testing, hosting) and the pilot monthly cost | `docs/adr/0002-tech-stack-and-boilerplate.md` (input: `product/research/stack-and-boilerplate-evaluation.md`) | Supervisor (research subagent) | 👤 Human (cost) | ✅ Accepted with amendment (local-first, free) |
| P0-3 | **Domain model + authorization model:** ERD for the §5.2 entities, tenancy enforcement approach, role/recipient permission matrix, guest-token and OTP design, snapshot-integrity approach | `docs/adr/0003-domain-and-authorization-model.md` | Supervisor (architect subagent) + security review | 👤 Human (security/data) | ⬜ |
| P0-4 | **Local environment & dependency plan:** Docker Compose services (Postgres, MinIO, ClamAV, Mailpit), `.env.example` variable inventory, adapter interfaces for storage, email and scanning, local backup/restore, and phone testing over LAN or a tunnel. Cloud hosting is deferred to a later ADR | `docs/plans/environments-and-dependencies.md` | Supervisor | 👤 Human (accounts/cost) | ⬜ |
| P0-5 | **UX direction:** screen inventory from §6.4, key flows (guest verify → review → comment → approve), visual direction and design tokens; low-fi wireframes for the review canvas and submission builder | `product/ux/` | UX subagent | 👤 Human (UX) | ⬜ |
| P0-6 | **Repo bootstrap:** fork the chosen boilerplate into the repo, strip out-of-scope features (e.g. billing), CI green (lint, format, typecheck, unit, E2E smoke), branch protection on `main`, preview deploys | PR "chore: bootstrap from <boilerplate>" | One builder | Supervisor (G2/G3); 👤 Human (CI/infra) | ⬜ |
| P0-7 | **Agent roster:** builder, reviewer, security-reviewer and QA agent definitions | `agent-system/agents/*.md` (project-neutral) | Supervisor drafts | 👤 Human | 🟡 Drafted 2026-11-21, awaiting acceptance |
| P0-8 | **Wave 1 backlog:** walking skeleton (auth → workspace/tenancy → project/client), then ≥5 independent tickets with dependencies mapped | GitHub Issues + Project board | Supervisor | Supervisor | ⬜ |

## Order

```
P0-1 SRS ──┬──> P0-3 Domain/Auth ADR ──┐
P0-2 Stack ┴──> P0-4 Env plan ─────────┼──> P0-6 Bootstrap ──> P0-8 Wave 1 backlog ──> G0
P0-5 UX direction (parallel) ──────────┘
P0-7 Agent roster (parallel, before P0-6)
```

P0-1, P0-2, P0-5 and P0-7 can run at the same time. P0-6 is the first PR that adds code, and only after P0-2, P0-3 and P0-4 are accepted.

## Human actions expected in Phase 0
- Accept or amend the SRS, the stack ADR and the domain/auth ADR.
- Create the **review bot GitHub account** (A1) and a fine-grained token for this repo. Cloud accounts are deferred (running locally).
- ~~Enable branch protection on `main`~~ Done, enforced for admins.
