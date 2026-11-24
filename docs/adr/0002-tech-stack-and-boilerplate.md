# ADR-0002: Tech stack and starting boilerplate

- **Status:** Accepted with amendment (human, 2026-11-21). Application stack and boilerplate accepted; **hosting and paid vendors deferred**. Run locally with free tools for now (see Amendment).
- **Date:** 2026-11-21
- **Deciders:** Human (accept), Supervisor (proposes)
- **Requires human acceptance:** yes
- **Evidence:** [product/research/stack-and-boilerplate-evaluation.md](../../product/research/stack-and-boilerplate-evaluation.md) (scored shortlist, sources, as of 2026-11-21)

## Context
ProofDesk Phase 1 needs: multi-tenant workspaces with Owner/Member roles and invites; scoped, revocable guest links with email OTP for clients (no accounts); immutable file versions in private object storage with malware scanning; a mobile-friendly PDF and image viewer with pins that stay on the right spot; append-only approval and activity history; email notifications and scheduled reminders. One founder and AI agents build it. Phase 1A is a 3–5 studio pilot, so ops burden and cost must stay low, and the codebase should be one AI agents handle well.

## Options considered (boilerplates, scored out of 100)
1. **ixartz/SaaS-Boilerplate (MIT), 83.** Next 16 + Drizzle + Postgres, with orgs/roles/invites, Vitest, Playwright, CI, Sentry and PGlite test DBs. Its auth is Clerk.
2. mickasmt Better Auth starter, 66. Has the right auth, but no tests, CI or invites.
3. Epic Stack, 64. Excellent engineering, but SQLite/Fly and no orgs.
4. BoxyHQ, 62. Has enterprise extras we would strip out, and runs on old NextAuth v4 / React 18.
5. Open SaaS, 58. The Wasp framework means lock-in, and it has no orgs.
6. Vercel saas-starter, 53. Unmaintained since 2025-12, with no tests.
7. Paid fallback: Makerkit (Drizzle + Better Auth), $349 one-time.

## Decision (proposed)
**Fork `ixartz/SaaS-Boilerplate`**, then:
- **Swap Clerk for Better Auth** (organization plugin) as the first foundation ticket, roughly 2–4 agent-days. This keeps users, orgs and tenant data in one Postgres database, which RLS needs.
- **Strip out** i18n, Checkly, Crowdin, marketing pages and any pricing/billing stubs.

| Layer | Choice | Alternative |
|---|---|---|
| App | Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, shadcn/ui, Zod 4 | React Router 7 |
| Professional auth | Better Auth + organization plugin | Keep Clerk for 1A |
| Guest auth | Custom module: hashed 256-bit link tokens scoped to recipient + submission, hashed 6-digit OTP (10 min, 5 attempts, rate-limited), HttpOnly guest session cookie | — |
| DB | Postgres on Neon; Drizzle ORM + committed SQL migrations | Supabase / Prisma |
| Tenant isolation | `workspaceId` always taken from the server session in the data layer, plus Postgres RLS as a backstop | App layer only |
| Immutability | Triggers that reject UPDATE/DELETE on approval/activity tables and on published submissions | — |
| Files | AWS S3 private bucket; presigned upload and short-lived presigned download after an authorization check | Cloudflare R2 |
| Malware scan | GuardDuty Malware Protection for S3; only files marked `clean` are served | ClamAV worker |
| PDF / image viewer | pdfjs-dist via react-pdf (virtualized pages, canvas size cap, server-rendered previews); react-zoom-pan-pinch | EmbedPDF |
| Pins | `{assetVersionId, pageIndex, x, y}` with x,y ∈ [0,1] relative to the PDF page box, converted with pdf.js viewport transforms | — |
| Jobs / reminders | pg-boss in a small always-on worker (Fly.io or Railway) | Trigger.dev v4 |
| Email | Resend + React Email on a sending subdomain (SPF/DKIM/DMARC) | Postmark / SES |
| Testing | Vitest, Playwright (incl. mobile WebKit), axe-core, MSW; GitHub Actions with a Neon branch per run | — |
| Observability | Sentry + pino logs + Vercel Speed Insights | — |
| Hosting | Vercel Pro (web) + Fly.io/Railway (worker) | All on Fly/Railway |

**Estimated pilot cost:** about **$30–75/month**. Some prices were unverified; see the research doc's verification notes.

## Amendment (2026-11-21): local-first, free tooling

The product owner decided: **use everything free and run locally for now.**

**Still accepted:**
- fork `ixartz/SaaS-Boilerplate`
- swap Clerk for Better Auth
- the application libraries in the table above: Next.js, Drizzle, react-pdf/pdf.js, react-zoom-pan-pinch, pg-boss, React Email, Vitest, Playwright

**Local replacements for the cloud services**, all run with Docker Compose at no cost:

| Cloud choice (deferred) | Local / free replacement | Note |
|---|---|---|
| Neon Postgres | Postgres 17 container (+ PGlite for unit tests, already in the boilerplate) | Same SQL migrations; RLS and triggers work the same |
| AWS S3 | S3-compatible local server: **SeaweedFS** container (`chrislusf/seaweedfs:4.55`, Apache-2.0) | Code uses the AWS SDK S3 client, so switching to S3/R2 later is a config change. **Amended 2026-11-24 — see the second amendment below:** MinIO was the original choice and is no longer available; SeaweedFS was this ADR's named fallback and is now the primary |
| GuardDuty malware scan | **ClamAV** container called from the worker | GPL, also a separate service only. Same `pending_scan → clean/infected` flow |
| Resend email | **Mailpit** container (catches all email; web inbox at localhost) | React Email templates unchanged; switch to a real provider at hosting time |
| Vercel + Fly.io | `next dev` / `next start` + the pg-boss worker as a local process | — |
| Sentry | Console/pino logs locally; Sentry free tier optional | — |
| Phone testing | Same Wi-Fi via the laptop's LAN IP, or a free tunnel (e.g. Cloudflare quick tunnel) for a real-device check | The tunnel is for test sessions only; never use it with real client data |

**Consequences of the amendment:**
- Pilot cost while local: **$0**.
- Real external pilots can't start until hosting is decided. That becomes a new ADR (hosting and vendors, region per open decision B4) before Phase 1A pilot onboarding.
- Bootstrap (P0-6) must add a `docker-compose.yml` for Postgres, SeaweedFS, ClamAV and Mailpit, plus `.env.example` pointing at them, so every builder worktree runs the same stack.
- Code must reach storage, email and scanning through small adapter interfaces, so the hosting ADR only changes configuration.

## Second amendment, accepted 2026-11-24: object storage is SeaweedFS, not MinIO

**Accepted by the product owner on 2026-11-24.** HUMAN APPROVAL RECORDED: "Approve the swap to SeaweedFS and amend ADR-0002 and the SRS", 2026-11-24.

**Why.** MinIO can no longer be used. Verified by the supervisor on 2026-11-24:

- `https://hub.docker.com/v2/repositories/minio/minio/tags` returns **HTTP 404** — the Docker Hub repository is gone.
- The MinIO community edition stopped publishing container images in **October 2025**, entered maintenance mode in **December 2025** with security fixes evaluated case by case, and the upstream GitHub repository was **archived in April 2026**.

**What replaces it.** SeaweedFS, which this ADR already named as the fallback, is now the primary local object store. Verified on 2026-11-24:

| Check | Result |
|---|---|
| Image | `chrislusf/seaweedfs:4.55`, tag `last_updated` 2026-11-23 |
| Architectures | amd64, arm64, 386, arm/v7, ppc64le, s390x |
| License | Apache-2.0 (pre-approved) |
| Upstream | `seaweedfs/seaweedfs` — not archived, last push 2026-11-24, 36.2k stars |

**Scope of this amendment.** Local object storage only. Nothing else in this ADR changes: the application still reaches storage through the AWS SDK S3 client behind an adapter interface, so a later move to S3 or R2 remains a configuration change.

**Known difference, and how it is checked.** SeaweedFS's S3 implementation is not byte-identical to AWS. Presigned **PUT** is the supported upload path and is what the design uses; presigned POST policy has reported problems. P0-6 must ship a throwaway integration test — presign PUT, upload a 50 MB file from a browser, presign GET with `response-content-disposition` — and escalate on failure rather than redesigning around it.

**Consequence for other documents.** SRS `NFR-ENV-1` named MinIO and is amended in the same change. Any agent finding "MinIO" in an older document should treat this amendment as authoritative and must not re-add MinIO on the authority of an Accepted document.

## Consequences (original proposal)
- **Week-1 spike before any viewer feature work:** render a real large architecture PDF (A1/A0) on a real iPhone. If pdf.js fails, switch to the EmbedPDF fallback through a new ADR.
- File bytes never pass through Vercel functions (4.5 MB body limit). Everything heavy runs in the worker.
- Presigned GET links can't be revoked one by one, so keep their lifetimes short. Revocation is enforced at the link-signing step.
- Agents must not add libraries outside this table without a ticket entry (see operating defaults).
- **The human must create the accounts and keys:** Vercel, Neon, AWS (S3 + GuardDuty), Fly.io or Railway, Resend plus a domain, Sentry. Agents see variable names only, through `.env.example`.
- **Open choices the human may override when accepting:**
  - (a) keep Clerk instead of switching to Better Auth
  - (b) Trigger.dev instead of a self-run worker
  - (c) R2 + ClamAV instead of S3 + GuardDuty
