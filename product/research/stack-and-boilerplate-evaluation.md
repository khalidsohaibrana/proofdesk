# ProofDesk: Stack and Boilerplate Evaluation

> **As of 2026-11-21.** GitHub stars, push dates, licenses and npm versions were pulled live on this date (`gh api`, `npm view`). Pricing comes from web search. Vendor pages were used where they were found, and third-party summaries are flagged as such. Re-check prices before you commit money.

Requirements source: `product/ProofDesk_Phase_1_Scope_Baseline.md`, sections 3, 4, 6 and 7.

What the requirements mean for the stack:

- **Tenancy.** A workspace is the tenant. Roles are Owner and Member. Members join by invitation. Every query is scoped by workspace on the server.
- **Professional identity.** Email and password, email verification, and password reset.
- **Guest identity.** This flow has to be custom. Clients get no account, only an unguessable token scoped to one recipient and one submission. The workspace can revoke it. A client can view before verifying but needs an email OTP before commenting or deciding. No boilerplate does this out of the box, so we build it on top of whatever auth we choose.
- **Files.** PDF, JPG and PNG uploads go straight to object storage. Versions are immutable. Downloads use short-lived signed URLs. Files are malware-scanned.
- **Viewer.** Multi-page PDF and images with zoom, pan and pin comments. Pins are stored as normalized coordinates that account for rotation and crop. The guest view must work well on phones.
- **Records.** Submission snapshots are immutable. The approval and activity log is append-only.
- **Email and jobs.** Transactional email, plus scheduled due-date reminders run as background jobs.
- **Constraints.** One founder working with AI coding agents. A pilot with 3–5 studios. Low ops and low cost. No billing in Phase 1A.

---

## 1. Boilerplate shortlist

### 1.1 Candidates (verified 2026-11-21)

| # | Repo | License | Stars | Last push / last commit | Stack (from live package.json) |
|---|---|---|---|---|---|
| A | [ixartz/SaaS-Boilerplate](https://github.com/ixartz/SaaS-Boilerplate) | MIT (free edition; paid "Pro" edition exists) | 7,495 | push 2026-11-01; last main commit 2026-08-21; release v1.9.1 (2026-07-01) | Next ^16.2, React 19.2, **Clerk** ^7.5, Drizzle ^0.45, pg + PGlite, Vitest ^4.1 (browser mode), Playwright ^1.61, Sentry ^10, ESLint 10, Tailwind 4, next-intl, Zod 4, GitHub Actions CI, Checkly |
| B | [nextjs/saas-starter](https://github.com/nextjs/saas-starter) (Vercel) | MIT | 16,260 | **last commit 2025-12-11** (CVE bump only) | Next 15.6 canary, Drizzle ^0.43, postgres.js, Stripe, custom JWT cookie auth, teams + Owner/Member + invitations table. No tests, no email sending |
| C | [epicweb-dev/epic-stack](https://github.com/epicweb-dev/epic-stack) | MIT | 5,549 | 2026-10-25 | React Router 7 (framework mode), **Prisma 6 + SQLite/LiteFS on Fly.io**, @epic-web/totp (email OTP verify), passkeys, 2FA, Vitest, Playwright, MSW, GitHub Actions deploy. No orgs or teams |
| D | [wasp-lang/open-saas](https://github.com/wasp-lang/open-saas) | MIT | 16,383 | 2026-11-11 (template v0.26, 2026-10-15) | Wasp DSL (React + Node + Prisma), built-in auth, email, Wasp jobs (pg-boss), S3 presigned upload, Stripe/Lemon/Polar/Paddle, Playwright e2e. **No orgs, teams or invitations** |
| E | [mickasmt/next-saas-stripe-starter](https://github.com/mickasmt/next-saas-stripe-starter) | MIT | 3,018 | 2026-09-28 (v2.0.0, 2026-09-26) | Next 16.3, **Better Auth ^1.7.5** (organizations + roles), Drizzle ^0.45, Neon, Stripe, Fumadocs. **No invitations UI, no test suite, only a prune workflow in CI** |
| F | [boxyhq/saas-starter-kit](https://github.com/boxyhq/saas-starter-kit) | Apache-2.0 | 4,971 | 2026-05-08 (deps bump); last release v1.6.0 (2024-12) | Next 15.5, React 18, NextAuth v4, Prisma 6, teams + invitations + SAML SSO + audit logs (Retraced) + webhooks (Svix), Playwright, Jest, Sentry, Stripe. Heavy and enterprise-oriented |
| G | [t3-oss/create-t3-app](https://github.com/t3-oss/create-t3-app) | MIT | 29,242 | last commit 2025-12-13 (v7.40.0, 2025-11) | CLI scaffold: Next, tRPC, Prisma/Drizzle, NextAuth. No orgs, invites, email or tests. A scaffold, not a SaaS kit |
| H | Supabase starters (official `with-supabase` Next template) | Apache-2.0 (supabase repo) | 115k (monorepo) | active | Supabase Auth plus RLS. No first-party orgs or invitations; you build them with RLS |

Paid alternatives, for reference only:

- **Makerkit.** Next.js kits for Supabase, Drizzle + Better Auth, or Prisma + Better Auth. Organizations, invitations and roles are wired in. **$349 Pro or $649 Teams**, one-time, lifetime updates (vendor pricing page).
- **Supastarter.** About $299–$399 one-time for a solo licence, but sources conflict. Check supastarter.dev.

Paying for either removes about 1–2 weeks of org, invite and RBAC plumbing. Either is a reasonable fallback if the free path stalls.

### 1.2 Fit against ProofDesk needs

| Need | A ixartz | B Vercel | C Epic | D Open SaaS | E mickasmt | F BoxyHQ |
|---|---|---|---|---|---|---|
| Email/password auth with verify and reset | Yes (Clerk) | Partial (no email verify or reset) | Yes | Yes | Yes (Better Auth) | Yes |
| Orgs + roles | Yes (Clerk orgs) | Yes (team, Owner/Member) | No | No | Yes | Yes |
| Invitations | Yes (Clerk) | Partial (table and flow, no email send) | No | No | No | Yes |
| Transactional email | Clerk sends auth mail; app email needs adding | No | Yes (Resend) | Yes | Partial | Yes |
| Postgres ORM + migrations | Drizzle + drizzle-kit | Drizzle | Prisma on **SQLite** | Prisma/Postgres | Drizzle | Prisma |
| Unit + E2E tests | Vitest + Playwright | No | Vitest + Playwright | Playwright | No | Jest + Playwright |
| CI | GitHub Actions on PRs | No | Yes | Partial | No | Yes |
| Lint/format | ESLint 10 + Prettier | Minimal | ESLint + Prettier | Prettier | ESLint | ESLint |
| Observability | Sentry | No | Sentry | Partial | No | Sentry |
| Background jobs | No | No | No | Yes (pg-boss) | No | No |
| Maintenance | Active | **Stale (11 months)** | Active | Active | Active | Slowing |

### 1.3 Scoring

Weights: needs coverage 30, maintenance 20, stack fit (TS, Next, Postgres, low ops) 20, testing + CI 15, removal cost (low = good) 15. Each item is scored 1–5, then weighted to a total out of 100.

| Candidate | Coverage (30) | Maint. (20) | Stack fit (20) | Tests/CI (15) | Strip cost (15) | **Total** | Notes |
|---|---|---|---|---|---|---|---|
| **A ixartz/SaaS-Boilerplate** | 4 → 24 | 4 → 16 | 4 → 16 | 5 → 15 | 4 → 12 | **83** | Best tooling and testing base. Auth depends on Clerk (see 2.2) |
| E mickasmt (Better Auth) | 3 → 18 | 4 → 16 | 5 → 20 | 1 → 3 | 3 → 9 | 66 | Right auth stack, but no tests, CI or invites. Stripe is woven in |
| C Epic Stack | 2 → 12 | 5 → 20 | 2 → 8 | 5 → 15 | 3 → 9 | 64 | Excellent engineering. SQLite/LiteFS/Fly and no orgs are wrong for us |
| F BoxyHQ | 4 → 24 | 2 → 8 | 3 → 12 | 4 → 12 | 2 → 6 | 62 | Enterprise extras to remove (SAML, Svix, Retraced). NextAuth v4, React 18 |
| B Vercel saas-starter | 3 → 18 | 1 → 4 | 4 → 16 | 1 → 3 | 4 → 12 | 53 | Clean and small but unmaintained, with weak auth |
| D Open SaaS | 2 → 12 | 5 → 20 | 2 → 8 | 3 → 9 | 3 → 9 | 58 | Wasp DSL adds framework lock-in. No orgs |
| G create-t3-app | 1 → 6 | 2 → 8 | 4 → 16 | 1 → 3 | 5 → 15 | 48 | Scaffold only |

### 1.4 What to remove or replace in the chosen base (A)

- Remove i18n (next-intl and the `[locale]` routing segment) unless pilots are multilingual.
- Remove Checkly, Crowdin and the marketing landing sections. Remove pricing and Stripe stubs if present in the free edition (Stripe is not in the free edition's package.json).
- **Replace Clerk with Better Auth** (organization plugin with Owner/Member mapped onto Better Auth's owner/member roles; drop "admin" or keep it unused). This is the main refactor, roughly 2–4 agent-days. It means rebuilding the sign-in, sign-up, org-switch and member/invite screens, optionally with `@daveyplate/better-auth-ui` 3.4.0 (last published 2026-03, so check that it still fits).
- Keep Drizzle, PGlite (fast local and test DB), Vitest, Playwright, the GitHub Actions CI, ESLint/Prettier, Sentry and Zod.

**Risk for A:** the free edition is partly a funnel for the paid Pro edition. Main-branch commits slowed after 2026-08, though pushes continue. Once forked, we own the code, so upstream pace matters little.

---

## 2. Recommended stack

All TypeScript, end to end. Versions are npm latest as of 2026-11-21.

| Layer | Recommendation | Why (one line) | Alternative |
|---|---|---|---|
| Framework | **Next.js 16** (16.4.6, App Router, Server Actions and Route Handlers), React 19, Tailwind 4 + shadcn/ui | Biggest ecosystem and the best-known stack for AI agents; the base (A) is already on it | React Router 7 (framework mode) |
| Auth (professionals) | **Better Auth 1.7.x** (1.7.27) with `organization` plugin (invites, roles, access control), email verification and password reset | Self-hosted in our own Postgres, no per-org or MRU fees, and first-class org, role and invite support | Clerk (already in base A; free to 50k MRU and 100 retained orgs, so fine for the pilot; adds vendor lock-in and a second user store) |
| Auth (guests) | **Custom module**: `GuestAccessLink` (random 256-bit token, store SHA-256 hash only, scoped to recipient + submission, `revokedAt`, `expiresAt`) + `VerificationChallenge` (6-digit OTP, hashed, 10-minute TTL, at most 5 attempts, rate-limited per link and IP) → issues an HttpOnly, SameSite=Lax guest session cookie bound to link + email | Better Auth's `email-otp` plugin signs users in and auto-creates accounts, which conflicts with "no client accounts", so a small purpose-built flow is clearer and easier to audit | Better Auth `email-otp` with `disableSignUp` plus shadow "guest" users (not recommended: it mixes guest and professional identities) |
| DB | **Postgres 16/17 on Neon** (Launch plan, usage-based: about $0.106/CU-hour, $0.35/GB-month, no minimum) | Serverless Postgres, branching for preview and E2E, PITR backups, Vercel integration | Supabase Postgres (Pro $25/mo) or Railway Postgres |
| ORM / migrations | **Drizzle ORM 0.45.x + drizzle-kit 0.31.x** (SQL migrations committed to the repo) | Already in base A; SQL-first; fast and typed; works with PGlite in tests | Prisma (v7 stable, v8 in RC; heavier, but a strong migration story) |
| Tenant isolation | Every repository function takes `workspaceId` from the server-side session; add **Postgres RLS** on tenant tables as a second guard (session variable `app.workspace_id`) | Section 7 asks for strict server-side isolation; RLS catches agent-written query mistakes | App-layer only, plus integration tests that try cross-tenant access |
| Append-only log / immutability | `activity_event` and `approval_decision` tables with `REVOKE UPDATE, DELETE` from the app role + a trigger that rejects UPDATE/DELETE; submissions frozen via `published_at` + a trigger | Enforced in the DB rather than by convention | Event-sourcing library (overkill) |
| Object storage | **AWS S3** (private bucket, SSE-S3 encryption at rest), browser upload via **presigned PUT/POST** (`@aws-sdk/client-s3` + `s3-request-presigner`), downloads via 60–300 s presigned GET after an authorization check | Pairs natively with GuardDuty malware scanning; upload bypasses Vercel's 4.5 MB body limit | **Cloudflare R2** (S3-compatible, zero egress, 10 GB free) when scanning moves to a ClamAV worker |
| Malware scanning | **Amazon GuardDuty Malware Protection for S3** ($0.09/GB scanned + per-object fee; 12-month free tier). It tags objects as clean or infected. The app sets `AssetVersion.status = pending_scan → clean/infected` and serves only clean files | Fully managed, no ops | Self-hosted ClamAV container (`clamav/clamav`) on Fly.io/Railway, triggered by a job (about $5/mo, more ops). Do not send client drawings to VirusTotal (it is public) |
| Upload validation | Server-side checks: allowed MIME + magic bytes (`file-type`), size cap (e.g. 200 MB), page count with `pdfjs-dist` in a job, strip EXIF on derived images | Section 7 requires safe file handling | — |
| PDF rendering | **pdfjs-dist 6.x (6.5.438)** used directly (or through **react-pdf 11.1.0**, which wraps pdf.js) with a virtualized page list, rendering only visible pages ±1 and capping canvas pixels | Free (Apache-2.0), actively maintained, and gives full access to viewport transforms for rotation and crop | **EmbedPDF** (`@embedpdf/*` 2.x/3.x, PDFium via WASM, Apache-2.0 for the viewer packages; its `cloudpdf/server` part is FCL) has built-in annotation and tiling, so evaluate it if pdf.js mobile performance disappoints. Commercial: Nutrient/PSPDFKit or Apryse (expensive) |
| Server-side previews | In the scan-complete job, render page-1 thumbnails and low-res page previews to WebP (pdf.js in Node, or `@napi-rs/canvas`/`mupdf` WASM), and store them as derived objects | Fast mobile first paint, plus a fallback when the client can't render a huge page | — |
| Image viewer | **react-zoom-pan-pinch 4.4.0** (MIT, active) around `<img>` / page canvas, with a pin overlay layer in the same transformed container | Pinch, wheel and double-tap zoom on mobile with little code | OpenSeadragon (deep-zoom tiles; for very large rasters later) |
| Pin coordinate model | Store `{assetVersionId, pageIndex, x, y}` with **x,y ∈ [0,1] relative to the unrotated, uncropped page box** (PDF CropBox in PDF user space, origin top-left after flip). Use `PageViewport.convertToPdfPoint` / `convertToViewportPoint` to map between screen and PDF space, so pins survive the viewer rotation (`/Rotate` + user rotation), zoom and crop. For images, normalize to natural width/height after EXIF orientation is applied | Pins stay anchored to an exact AssetVersion regardless of device, zoom or rotation | Store in PDF points plus page size (equivalent; normalized is simpler for images) |
| Comments realtime | No realtime in 1A: refetch on focus + polling (TanStack Query) | Keeps ops low | Supabase Realtime, Pusher or Ably later |
| Background jobs + scheduling | **pg-boss 12.x** (12.38.2, MIT, Postgres-backed queue + cron) in a small always-on **worker** process (Fly.io/Railway, about $5/mo) | One less vendor: jobs live in our Neon DB, reminders become cron schedules, and work is transactional with app writes (outbox) | **Trigger.dev v4** (SDK 4.8.8; free tier $5 credit and 10 schedules; managed, works from Vercel without a worker) or **Inngest** (4.26.2). Vercel Cron alone is a trigger, not a queue (Hobby is limited to once a day and is non-commercial) |
| Transactional email | **Resend** (SDK 6.39) + **React Email** (components 1.0.12); dedicated sending subdomain with SPF/DKIM/DMARC | Simple API, good DX; free tier 3,000/mo (100/day), Pro $20/mo for 50k | Postmark (strong transactional deliverability) or AWS SES (cheapest) |
| Validation | Zod 4 on every Server Action and Route Handler | Already in base A | Valibot |
| Testing | **Vitest 5** (unit + integration against PGlite / Neon branch), **Playwright 1.65** (E2E incl. mobile WebKit/iPhone profile for guest review; `@axe-core/playwright` for a11y), MSW for HTTP mocks; GitHub Actions on PR with Neon branch per run | Base A already ships Vitest + Playwright + CI; WebKit project approximates iOS Safari | Real-device checks on BrowserStack before pilot |
| Lint/format | ESLint 10 + Prettier (from base) and `tsc --noEmit` in CI | Already present | Biome |
| Observability | **Sentry** (`@sentry/nextjs` 11.x: errors, tracing, session replay with masking on) + structured logs (pino) shipped by host; Vercel Analytics/Speed Insights for CWV | Sentry is already in base A; free Developer tier is enough for the pilot | Better Stack / Axiom for logs, PostHog for product analytics |
| Hosting (web) | **Vercel Pro** (Hobby is non-commercial; Pro includes $20/mo usage credit per the Vercel docs) | Zero-ops Next.js hosting, preview deploys, Neon integration | Fly.io / Railway running Next standalone (one platform for web + worker) |
| Hosting (worker) | **Fly.io or Railway** small instance running the pg-boss worker (reminders, scan follow-up, thumbnails, email outbox) | Long-running process; avoids serverless timeouts for PDF processing | Trigger.dev managed tasks (no worker to run) |

### 2.1 Rough pilot monthly cost (3–5 studios, under 50 users, under 50 GB files)

| Item | Est. $/mo |
|---|---|
| Vercel Pro (1 seat) | ~$20 |
| Neon Launch (low usage, scale-to-zero) | ~$5–20 |
| AWS S3 storage + requests + egress (~20–50 GB) | ~$1–6 |
| GuardDuty S3 malware scan (~10–20 GB/mo new uploads) | ~$1–2 (free tier in year 1) |
| Fly.io/Railway worker (shared-cpu, 256–512 MB) | ~$3–7 |
| Resend | $0 (free) → $20 if over 100 emails/day |
| Sentry | $0 (Developer) |
| Domain + DNS | ~$1–2 |
| **Total** | **≈ $30–75 / month** |

If you choose Trigger.dev instead of a worker: subtract the worker, then add $0 (free tier) to $10 (Hobby; sources conflict on paid tiers). If you choose R2 + ClamAV instead of S3 + GuardDuty: similar total, with more ops.

### 2.2 Auth decision detail (Better Auth vs keeping Clerk)

- **Better Auth.** Users, orgs, members and invitations sit in our own Postgres, next to the tenant data. That makes RLS, joins and backups simpler, and there is no per-org meter. The organization plugin supports invitations (configurable expiry, limits, re-invite cancellation), default owner/admin/member roles and custom access-control statements. Note that invitation email delivery is the app's job, through the `sendInvitationEmail` hook. The library is very active (30.8k stars, pushed 2026-11-20).
- **Clerk.** Fastest path, because base A already wires it, and it is free at pilot scale. The downsides are vendor lock-in, a user store outside our DB that needs webhook sync, and cost growth past 100 monthly retained orgs (sources cite a B2B add-on around $85–100/mo).
- **Either way**, the guest link + OTP flow is custom code in ProofDesk. Neither provider models scoped, revocable guest reviewers.

---

## 3. Key risks and unknowns

1. **pdf.js on mobile Safari (high).** iOS Safari limits a single canvas to about 16.7 M pixels (4096×4096) and caps total canvas memory. Large-format architectural sheets (A1/A0 at high zoom) will hit those limits, leaving blank pages or crashing the tab. pdf.js has no built-in tiling. **Mitigations:**
   - Cap `devicePixelRatio × scale` so canvas area stays under ~16 M pixels.
   - Virtualize pages and destroy off-screen canvases (set width/height to 0).
   - Show server-rendered WebP previews first and render vector detail on zoom.
   - Spike on a real iPhone in week 1 with a 30–100 MB A1 drawing set.
   - If it fails, evaluate EmbedPDF (tiling, PDFium WASM) or pre-rendered image tiles with OpenSeadragon.
2. **Large uploads on serverless (high).** Vercel Functions reject request and response bodies over 4.5 MB, including Server Actions. All uploads and downloads must go **directly between the browser and S3/R2** with presigned URLs; never proxy file bytes through Next. Use multipart upload for files over ~100 MB, plus resumable retries for spotty site connections. Presigned GETs cannot be revoked individually, so keep TTLs short (≤5 min) and mint them only after an authorization check.
3. **Cron and long jobs on serverless (medium).** Vercel Hobby cron runs at most once a day and is non-commercial; Pro allows once a minute but jobs remain function-time-limited. PDF thumbnailing and page counting can exceed function limits. Hence the always-on pg-boss worker, or Trigger.dev. Reminders must be idempotent (dedupe key `submissionId + recipientId + dueDate + kind`) and timezone-aware (store UTC, plus the recipient or workspace IANA timezone).
4. **Guest-token security (high).** Token leakage via email forwarding or the Referer header. Mitigations:
   - Send `Referrer-Policy: no-referrer` on guest pages.
   - Swap the URL token for a cookie session on first load and strip it from the URL.
   - Require OTP before any write.
   - Rate-limit OTP sends and verifies (e.g. Upstash or a Postgres token bucket).
   - Store only token hashes, and record IP and user agent in ActivityEvent.
5. **Malware scanning is async (medium).** GuardDuty scans complete after upload in seconds to minutes. The UI needs a "scanning" state, and the publish step must block until every included AssetVersion is clean. R2 has no native scanning, so choosing R2 means running ClamAV yourself.
6. **Coordinate correctness (medium).** PDFs with `/Rotate`, non-zero CropBox origins, or mismatched MediaBox/CropBox will mis-place pins if you normalize against the wrong box. Write property tests that round-trip screen→PDF→screen for 0/90/180/270 rotations and offset crop boxes. Images need EXIF orientation applied before normalization.
7. **Boilerplate auth swap (medium).** Replacing Clerk in base A touches middleware, onboarding and org screens. Do it first, before feature work, behind E2E tests (sign-up, verify, invite, accept, role check).
8. **Tenant isolation regressions from AI-written code (high).** Use a single data-access layer that requires `workspaceId`, Postgres RLS as a backstop, and a cross-tenant E2E/integration test suite that runs in CI.
9. **Email deliverability (low–medium).** OTP mail landing in spam blocks clients. Use a dedicated subdomain with SPF/DKIM/DMARC, a plain-text part, and "resend code" with a cooldown.
10. **Unverified pricing.** Several prices came from third-party summaries (see the notes in section 2.1). Confirm on the vendor pages before the pilot.

---

## 4. Final recommendation

1. **Fork `ixartz/SaaS-Boilerplate` (MIT, free edition).** It is the only actively maintained free starter on Next 16 + Drizzle + Postgres that already ships orgs, roles and invites, Vitest + Playwright, GitHub Actions CI, ESLint/Prettier, Sentry and PGlite test DBs.
2. As task 0, **swap Clerk for Better Auth** (organization plugin, Owner/Member), so identities, tenants and RLS live in one Postgres with no per-org vendor fees. Keeping Clerk for 1A is acceptable if speed matters more.
3. Remove i18n, Checkly/Crowdin and the marketing pages. Add Resend + React Email, a pg-boss worker, S3 presigned uploads + GuardDuty scanning, and the custom guest-link + OTP module.
4. Build the viewer on pdf.js (react-pdf) + react-zoom-pan-pinch with normalized, rotation- and crop-aware pin coordinates, and spike it on a real iPhone in week 1.
5. Fallback if the fork or swap stalls: buy **Makerkit's Drizzle + Better Auth kit ($349 one-time)**, or start from `mickasmt/next-saas-stripe-starter` and add tests and CI ourselves.

---

## Verification notes

- **Live-verified:** stars, push and commit dates, licenses and dependency versions (GitHub API, npm registry, 2026-11-21).
- **Vendor docs via search:** Vercel 4.5 MB limit, Vercel Hobby cron and commercial-use limits, R2 pricing, GuardDuty price ($0.09/GB, from the 2025 announcement; no 2026 change found), Neon paid rates (docs updated 2026-11-12), Better Auth email-OTP behaviour.
- **Third-party or conflicting:** Neon free-tier quotas, Resend tiers, Trigger.dev paid tiers, Clerk B2B add-on price, Supastarter price, Vercel Pro base price (docs mention a $20 usage credit).
- **Not verified:**
  - Whether ixartz's free edition still has any Stripe/billing code. It is not in package.json.
  - The exact current pdf.js upstream status of tiling and lazy rendering.
  - iOS total canvas memory figures (vendor-sourced).
  - The Fly.io and Railway prices (estimates).
- `trigger.dev` repo stats could not be fetched (network error).

## Sources

- https://github.com/ixartz/SaaS-Boilerplate
- https://github.com/nextjs/saas-starter
- https://github.com/epicweb-dev/epic-stack
- https://github.com/wasp-lang/open-saas
- https://github.com/mickasmt/next-saas-stripe-starter
- https://github.com/boxyhq/saas-starter-kit
- https://github.com/t3-oss/create-t3-app
- https://github.com/supabase/supabase
- https://github.com/better-auth/better-auth
- https://better-auth.com/docs/plugins/organization
- https://better-auth.com/docs/plugins/email-otp
- https://github.com/mozilla/pdf.js
- https://github.com/wojtekmaj/react-pdf
- https://github.com/embedpdf/embed-pdf-viewer
- https://github.com/BetterTyped/react-zoom-pan-pinch
- https://github.com/timgit/pg-boss
- https://github.com/inngest/inngest
- https://github.com/resend/react-email
- https://github.com/drizzle-team/drizzle-orm
- https://github.com/Cisco-Talos/clamav
- https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions
- https://vercel.com/docs/error/application/FUNCTION_PAYLOAD_TOO_LARGE
- https://vercel.com/docs/cron-jobs/usage-and-pricing
- https://vercel.com/docs/plans/hobby
- https://vercel.com/docs/platform/fair-use-policy
- https://neon.com/pricing
- https://neon.com/docs/introduction/plans
- https://developers.cloudflare.com/r2/pricing
- https://resend.com/pricing
- https://trigger.dev/pricing
- https://aws.amazon.com/about-aws/whats-new/2025/02/amazon-guardduty-malware-protection-s3-price-reduction
- https://docs.aws.amazon.com/guardduty/latest/ug/pricing-malware-protection-for-s3-guardduty.html
- https://clerk.com/pricing
- https://clerk.com/articles/clerk-pricing-explained
- https://makerkit.dev/pricing
- https://makerkit.dev/better-auth-saas-starter-kit
- https://lightrun.com/answers/wojtekmaj-react-pdf-canvas-area-exceeds-the-maximum-limit-width--height--16777216-on-ios
- https://bugs.webkit.org/show_bug.cgi?id=195325
- https://www.nutrient.io/blog/pdfjs-limitations-commercial-upgrade/ (vendor; biased)
- https://apryse.com/blog/pdf-js/pdf-js-reliability-benchmark (vendor; biased)
- npm registry (`npm view`) for: next, better-auth, drizzle-orm, drizzle-kit, pdfjs-dist, react-pdf, react-zoom-pan-pinch, pg-boss, @trigger.dev/sdk, inngest, resend, @react-email/components, @playwright/test, vitest, @sentry/nextjs, @aws-sdk/client-s3, prisma, @embedpdf/core, @clerk/nextjs, @daveyplate/better-auth-ui
