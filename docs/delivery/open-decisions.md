# Open Decisions: recommended answers for human review

**Status:** Answered by the product owner in the session on 2026-11-21. Merged = approved.

**How to use this sheet:**
1. Each item has a recommended answer. Tick **Approve**, or tick **Change** and write your answer on the line under it.
2. Merging this PR approves everything ticked.
3. The supervisor copies approved items into `operating-defaults.md` / `decision-log.md`. Items left unticked stay open, and the supervisor asks about them when they become blocking.

**Priority:** 🔴 blocks starting work · 🟠 needed during Phase 0 · 🟢 can wait until Phase 1A

---

## A. Multi-agent system

### A1 🔴 Agent GitHub identity
**Recommended:**
- Create one machine-user GitHub account (e.g. `<you>-review-bot`) with a fine-grained token limited to this repo.
- Reviewer, security-reviewer and QA post verdicts as that account; builders and the supervisor keep using yours.
- Then branch protection can require **1 real GitHub approval**, and an approval can no longer come from the account that wrote the code.
- You create the account and token; agents never see the token value.

**Alternative:** keep a single identity and comment-based verdicts until production (current setup; verdicts can be forged).
- [x] Approve  - [ ] Change

### A2 🔴 Parallelism and model mix
**Recommended:**
- Wave 1 runs **3 builders** in parallel; raise to 5 after the first wave merges cleanly.
- Models: supervisor, reviewer, security-reviewer and the discovery agents on **Opus**; builders and QA on **Sonnet**.

**Alternative:** 5 builders from Wave 1; all Opus (higher quality, about 3–5× the usage).
- [x] Approve  - [ ] Change

### A3 🔴 Usage budget
**Recommended:**
- Run on your Claude plan without a hard cap.
- The supervisor reports the session's ticket count and agent runs at every check-in.
- It pauses new dispatches if a single ticket needs more than 3 builder runs.

**Alternative:** set a fixed weekly budget and have the supervisor stop at it.
- [x] Approve  - [ ] Change

### A4 🟠 Your availability and check-ins
**Recommended:**
- The supervisor batches every non-urgent question into **one decision request per session**, using the STATUS format with options and a recommendation.
- Only production approval, security failures and data-loss risks interrupt you immediately.
- While waiting, it works on independent tickets.

**Alternative:** a fixed daily check-in time.
- [x] Approve  - [ ] Change

### A5 🟠 Session memory and handoff
**Recommended:**
- At the end of every session the supervisor updates **`docs/delivery/status.md`**: the current gate, tickets in flight, blockers, decisions waiting on you, and the next 3 actions.
- It updates the file through a docs PR it merges itself.
- Every new session starts by reading it, so nothing depends on chat history.

**Alternative:** rely on GitHub Issues and the decision log only.
- [x] Approve  - [ ] Change

### A6 🟠 Who may change the agent system itself
**Recommended:**
- Changes to `agent-system/**`, `.claude/settings.json` and `CLAUDE.md` need **your approval** in the PR, since they change how agents behave.
- The supervisor may propose them but not merge them.

**Alternative:** the supervisor may merge wording-only fixes.
- [x] Approve  - [ ] Change

### A7 🟠 Command safety deny-list
**Recommended:** add these to `.claude/settings.json` as denied commands:
- `rm -rf /`, `rm -rf ~`
- `git push --force*`, `git reset --hard origin*` on main
- `gh repo delete*`, `gh api -X DELETE*`
- `drop database`, `npx prisma migrate reset`, `drizzle-kit drop*`
- `curl … | sh`
- `vercel --prod*` (production deploys happen only after your approval)

Agents may still run normal dev commands.

**Alternative:** prompt-level rules only.
- [x] Approve  - [ ] Change

### A8 🟠 External tools (MCP) available to agents
**Recommended:**
- Agents use only `gh`, the browser/Playwright tools for QA, and docs lookup (Context7).
- Your personal connectors (ClickUp, Figma, Canva, Upwork pipeline, Semrush) are **not used** by project agents unless a ticket says so.
- Exception: Figma is allowed for `ux-designer` if you want designs in Figma.

**Alternative:** allow everything that's connected.
- [x] Approve  - [ ] Change

### A9 🟠 Evidence storage
**Recommended:**
- Screenshots and short videos (≤10 MB) are attached directly to the PR.
- Longer recordings go to a private S3 prefix `evidence/` (added in the environment plan) and are linked from the PR.

**Alternative:** a shared Google Drive folder.
- [ ] Approve  - [x] Change → Screenshots and short videos attached to the PR; **longer videos via Loom** (linked from the PR).

### A10 🟢 Quality targets for the agent system
**Recommended targets** (reviewed after Wave 2):
- median ticket lead time ≤ 2 working days
- average review rounds ≤ 2
- 0 escaped invariant/security defects
- under 20% of PRs needing your rework
- every PR has evidence

**Alternative:** track the numbers without targets.
- [x] Approve  - [ ] Change

### A11 🟠 Test coverage requirement
**Recommended:**
- **80% line coverage on domain/server code** (enforced in CI).
- Every invariant has a named test.
- UI is covered by E2E and visual checks rather than a coverage number.

(Your global Claude rules ask for 80% everywhere; this narrows it for UI.)

**Alternative:** 80% on everything.
- [x] Approve  - [ ] Change

### A12 🟠 Required CI checks (once the bootstrap PR adds CI)
**Recommended required checks on `main`:**
- format
- lint
- typecheck
- unit + integration (against a Neon branch)
- E2E smoke (desktop + mobile WebKit)
- dependency audit (high/critical fails)
- the cross-tenant access test suite

**Alternative:** start with lint, typecheck and unit only, then add the rest by Wave 2.
- [ ] Approve  - [x] Change → **Start minimal:** lint, typecheck and unit tests required first; add the rest by Wave 2.

### A13 🟢 Recording the presentation
**Recommended:**
- Record every supervisor session from Phase 0 onward with screen + voice.
- Keep a `docs/delivery/demo-log.md` of timestamps for key moments: gate checks, parallel dispatch, review loop, a blocked or escalated PR, your approval.
- Cut the final video from those.

**Alternative:** record only Wave 1.
- [ ] Approve  - [x] Change → **Not approved now.** No demo log; decide recording later.

---

## B. Product and project

### B1 🔴 Accept ADR-0002 (stack and boilerplate)
**Recommended:** accept as written:
- fork `ixartz/SaaS-Boilerplate`
- swap Clerk for Better Auth
- Neon, S3 + GuardDuty, a pg-boss worker on Fly.io, Resend, Vercel Pro
- about $30–75/month

**Alternatives:** keep Clerk for Phase 1A; Trigger.dev instead of the worker; R2 + ClamAV.
- [ ] Approve  - [x] Change → **Use everything free and run locally for now.** No paid hosting or cloud vendors yet (see ADR-0002 amendment).

### B2 🔴 Accounts you create (agents can't)
**Recommended set:**
- GitHub ✅
- Vercel (Pro)
- Neon
- AWS (S3 + GuardDuty, one IAM user scoped to the bucket)
- Fly.io
- Resend
- Sentry
- a domain registrar

You add the keys to Vercel/GitHub secrets yourself. The supervisor gives you the exact variable list in the environment plan.
- [ ] Approve  - [x] Change → **Deferred with B1.** No cloud accounts for now; the only account needed is the review bot GitHub account (A1).

### B3 🔴 Product domain and sending email
**Recommended:** buy a short product domain; send email from `mail.<domain>` (SPF/DKIM/DMARC); the app runs at `app.<domain>`.
- [ ] Approve  - [x] Change → **Deferred** until hosting.

### B4 🟠 Launch market and data region
**Recommended:**
- Choose where your pilot studios are, and host the database and files in that region (EU if any pilot is in the EU/UK, for GDPR).
- Write a short privacy notice before any real client uploads files.

**Alternative:** US region by default.
- [ ] Approve  - [x] Change → **Decide when moving to hosting.**

### B5 🟠 Legal basics before a real external client uses it
**Recommended:**
- Terms of Service, a Privacy Policy and a short data-processing statement for studios, written from a standard template and checked by you.
- Agents may draft them, but they are not legal advice.

**Alternative:** pilot under a simple written pilot agreement only.
- [ ] Approve  - [x] Change → **A simple written pilot agreement with each studio** for now.

### B6 🟠 File limits for the pilot
**Recommended:**
- 200 MB per file
- 100 pages per PDF for in-browser review
- 20 GB per workspace

These are soft limits shown in the UI; they get revisited from real usage in Phase 1B.
- [ ] Approve  - [x] Change → **Smaller limits: 50 MB per file, 50 pages per PDF, 5 GB per workspace.**

### B7 🟠 Data retention during the pilot
**Recommended:**
- Nothing is deleted automatically.
- A studio can request workspace deletion, which the founder performs manually.
- Approval records are never deleted while the workspace exists.
- Test a restore from Neon point-in-time recovery once before the first external client.
- [ ] Approve  - [x] Change → **Decide later.**

### B8 🟠 UX and brand direction
**Recommended:**
- `ux-designer` proposes 2 visual directions. Suggested: **"editorial architecture portfolio"**, quiet and typographic with the work dominating, plus one contrasting option.
- Each comes with tokens and wireframes of the review canvas at phone and desktop width.
- You pick one before any UI ticket.

**Alternative:** use the boilerplate's default shadcn look for the pilot.
- [x] Approve  - [ ] Change

### B9 🟢 Timeline
**Recommended:**
- Phase 0 (foundation): about 1 week, mostly waiting on your acceptances and accounts.
- Wave 1 (skeleton + 3–5 parallel tickets): about 2 weeks.
- Phase 1A complete (end-to-end scenario passing): 6–8 weeks.
- Pilot onboarding starts when the 11-step scenario passes on real devices.
- [x] Approve  - [ ] Change

### B10 🟢 Repository license
The repo is public and has no license, so the code is all rights reserved: people can see it but not reuse it.
**Recommended:** keep it that way (no LICENSE file) while ProofDesk is a commercial product.
**Alternative:** an open-source license.
- [x] Approve  - [ ] Change

### B11 🟢 Pilot recruitment (outside the agents' work)
**Recommended:**
- Start recruiting 3–5 studios during Wave 1, so pilots are lined up when the scenario passes.
- Agents can draft the outreach message and a 1-page pilot brief on request.
- [ ] Approve  - [x] Change → **Not approved now.**
