# ADR-0002: Tech stack and starting boilerplate

- **Status:** Proposed (awaiting human acceptance, because it involves cost and vendor choices)
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

## Consequences
- **Week-1 spike before any viewer feature work:** render a real large architecture PDF (A1/A0) on a real iPhone. If pdf.js fails, switch to the EmbedPDF fallback through a new ADR.
- File bytes never pass through Vercel functions (4.5 MB body limit). Everything heavy runs in the worker.
- Presigned GET links can't be revoked one by one, so keep their lifetimes short. Revocation is enforced at the link-signing step.
- Agents must not add libraries outside this table without a ticket entry (see operating defaults).
- **The human must create the accounts and keys:** Vercel, Neon, AWS (S3 + GuardDuty), Fly.io or Railway, Resend plus a domain, Sentry. Agents see variable names only, through `.env.example`.
- **Open choices the human may override when accepting:**
  - (a) keep Clerk instead of switching to Better Auth
  - (b) Trigger.dev instead of a self-run worker
  - (c) R2 + ClamAV instead of S3 + GuardDuty
