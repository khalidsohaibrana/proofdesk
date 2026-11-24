# Local Environment & Dependency Plan (Phase 1)

**Status:** Draft — awaiting product owner acceptance (accounts/cost)
**Ticket:** P0-4 (`docs/plans/phase-0-foundation.md`)
**Author:** Solution architect (Ridge)
**Date:** 2026-11-24
**Governing decisions:** [ADR-0002](../adr/0002-tech-stack-and-boilerplate.md) (Accepted with amendment: local-first, free tooling), [operating defaults](../delivery/operating-defaults.md) B1 (local only), A12 (CI = lint + typecheck + unit tests), B6 (50 MB/file, 50 pages/PDF, 5 GB/workspace), Product Knowledge §5.4 invariants and §7 security/privacy.

## Scope of this document

This plan decides **how a developer or builder agent runs ProofDesk on one laptop, for free, with no cloud account**. It covers the Docker Compose service set, the `.env` variable inventory, the three adapter interfaces that keep hosting swappable, local backup/restore, phone testing, the setup path, and what CI needs.

It deliberately decides **nothing** about hosting, region, domain, retention or managed vendors. See [§8 Deferred to the hosting ADR](#8-deferred-to-the-hosting-adr).

### Requirement traceability

Reconciled against `product/SRS.md` §3 (non-functional requirements). The plan was first drafted before the SRS reached this checkout and was then reconciled against it; §13 lists the changes that reconciliation forced.

| SRS requirement | Where this plan satisfies or defers it |
|---|---|
| NFR-SEC-1, NFR-SEC-11 (tenant isolation with a DB backstop; UPDATE/DELETE protection) | §1.2 non-owner, non-`BYPASSRLS` app role created in migration one; §7.1 PGlite RLS proof |
| NFR-SEC-2, NFR-OBS-1 (no plaintext token at rest or in logs) | §2.4 `GUEST_TOKEN_PEPPER`; §2.10 `LOG_REDACT_PATHS` |
| NFR-SEC-3, NFR-SEC-6 (OTP and endpoint rate limits) | §2.4 OTP policy variables; §1.3 Postgres-backed counters, no Redis |
| NFR-SEC-5 (signed download URL lifetime ≤ 5 min) | §2.5 `STORAGE_DOWNLOAD_URL_TTL_SECONDS=120`, schema-capped at 300 |
| NFR-SEC-7 (HTTPS outside the local loopback) | §5 — LAN testing is **not** loopback; see R5 and Q5 |
| NFR-SEC-8 (private storage, 0 public paths) | §3.1 presigned-only access, no public bucket policy, no `listObjects` in the domain |
| NFR-SEC-9 (only `clean` is previewable or downloadable) | §3.3 three-valued `ScanVerdict`; §2.8 `SCAN_REQUIRED_BEFORE_SERVE` |
| NFR-SEC-12 (only `.env.example` committed, 0 secrets in source) | §2 rules 1–3; §1.2 SeaweedFS identity file is **generated, not committed** |
| NFR-PRIV-3 (UTC storage, timezone-aware rendering) | §2.1 `TZ=UTC` |
| NFR-PERF-4 (bytes never through the web path) | §3.1 presigned PUT/GET; §2.5 `STORAGE_PUBLIC_ENDPOINT` |
| NFR-LIM-1, NFR-LIM-2, NFR-LIM-3 | §2.6 |
| NFR-REL-1 (documented and exercised local DB + object-store dump/restore) | §4, including the §4.6 restore drill |
| NFR-REL-3 (job retry without affecting domain state) | §3.2, §3.3 contract rules; §2.9 pg-boss |
| NFR-OBS-1 (structured logs, no secrets) | §2.1, §2.10 |
| NFR-OBS-3, NFR-OBS-4, NFR-OBS-5, NFR-OBS-6, NFR-A11Y-4 | §7 |
| NFR-ENV-1 (local Compose only, 0 paid dependencies) | §1 — **but it names MinIO, which no longer exists; see Q1** |
| NFR-ENV-2 (one adapter interface per concern) | §3 |
| NFR-ENV-3 (no real client data in a local or tunnelled session) | §4.4, §5.3 guards |
| NFR-SEC-4, NFR-SEC-10, NFR-PRIV-1/2/4, NFR-PERF-1/2/3/5, NFR-A11Y-1/2/3/5, NFR-MOB-1/2/3/4, NFR-LIM-4/5, NFR-REL-2, NFR-REL-4, NFR-OBS-2 | Not environment concerns, or deferred — owned by P0-3, P0-5 or the hosting ADR (§8) |

---

## 1. Docker Compose services

### 1.0 Shape of the local stack

**Only infrastructure runs in Compose. The app does not.** `next dev` and the pg-boss worker run as host processes against published container ports. Reasons: Docker Desktop bind-mount I/O on macOS makes `node_modules` and Next's dev compile painfully slow; host processes give instant HMR, native debugger attach and no image rebuild per dependency change; and it keeps the Compose file something the hosting ADR can delete without touching app code.

```
host:  next dev (:3000)   pg-boss worker (process)
         |        |              |        |      |
         v        v              v        v      v
compose: postgres:5432   seaweedfs:8333  mailpit:1025/8025  clamav:3310
```

### 1.1 Service table

| Service | Image, pinned | License | Purpose | Ports (host:container) | Volumes | Verified |
|---|---|---|---|---|---|---|
| `postgres` | `postgres:17.12-alpine` | PostgreSQL License (BSD-style) — pre-approved family | App DB, RLS backstop, immutability triggers, pg-boss queue | `5432:5432` | `pgdata:/var/lib/postgresql/data` | Docker Official Images "postgres" supported-tags list, fetched 2026-11-24: `17.12`, `17.12-alpine`, `17-alpine` present; 17.12 is the current 17.x patch |
| `objectstore` | `chrislusf/seaweedfs:4.55` | Apache-2.0 — pre-approved | S3-compatible private object storage (asset versions, previews) | `8333:8333` (S3), `9333:9333` (master), `8888:8888` (filer) | `seaweeddata:/data` | Docker Hub tag API `/v2/repositories/chrislusf/seaweedfs/tags/4.55` → exists, `last_updated` 2026-11-23. GitHub releases page: 4.55 on 2026-11-23, 4.52–4.54 in the preceding 3 weeks. GitHub license API → `Apache-2.0` |
| `mailpit` | `axllent/mailpit:v1.34.0` | MIT — pre-approved | Catches **all** outbound email; web inbox + REST API for E2E assertions | `1025:1025` (SMTP), `8025:8025` (UI/API) | `mailpitdata:/data` (optional; message store) | Docker Hub tag API: `v1.34.0` `last_updated` 2026-11-17. GitHub releases API `/releases/latest` → `v1.34.0`, published 2026-11-17 (a security-hardening release). Repo page → MIT |
| `clamav` *(opt-in profile `scan`)* | `clamav/clamav:1.5.5-debian13-slim` | **GPL-2.0 — NOT pre-approved, see Q2** | Malware scan over clamd TCP; only `clean` versions are ever served | `3310:3310` | `clamdb:/var/lib/clamav` | Docker Hub tags page for `clamav/clamav`, fetched 2026-11-24: `1.5.5-debian13-slim`, `1.5-debian13-slim`, `stable-debian13-slim` all pushed within the last day; `1.4.7` line also current |

**MinIO is removed from the stack.** ADR-0002's amendment names MinIO as the S3-compatible local store. That is no longer viable: `https://hub.docker.com/v2/repositories/minio/minio/tags` returns **HTTP 404** (the Docker Hub repo is gone), MinIO stopped publishing Community Edition images and binaries in October 2025, and the community edition entered maintenance-mode/archived status in December 2025 with security fixes "evaluated case by case". ADR-0002 already names **SeaweedFS (Apache-2.0)** as the fallback, so this plan takes the fallback. It needs a one-line ADR-0002 amendment — see Q1.

### 1.2 Per-service detail

#### postgres
- **Why Alpine:** smallest image, and we need no contrib extensions beyond what ships (`pgcrypto` for hashing helpers if the domain ADR wants them; no `pgvector`, no `postgis`).
- **Config that matters:** RLS and the UPDATE/DELETE-rejecting triggers (invariants 5, 8, 9, 14) are plain Postgres features and behave identically here and on any managed Postgres. The app must connect as a **non-superuser, non-owner role** or RLS is bypassed silently — create `proofdesk_app` (no `BYPASSRLS`, not the table owner) in the first migration, and have the app's `DATABASE_URL` use it. The migration runner uses a separate owner role.
- **Health check:** `pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"`, `interval: 5s`, `timeout: 3s`, `retries: 20`, `start_period: 10s`.
- **Resources:** ~60 MB idle, ~200 MB under local test load. `shared_buffers` default is fine; do not tune.
- **Env (container side, local throwaway values):** `POSTGRES_USER=proofdesk`, `POSTGRES_PASSWORD=proofdesk_local_dev`, `POSTGRES_DB=proofdesk`.

#### objectstore (SeaweedFS)
- **Mode:** single-binary dev server — `weed server -dir=/data -master.volumeSizeLimitMB=1024 -s3 -s3.port=8333 -s3.config=/etc/seaweedfs/s3.json`. One container provides master, volume, filer and the S3 gateway.
- **Credentials:** SeaweedFS S3 identities are configured from a small `docker/seaweedfs/s3.json`. **This file is generated by `dev:up` from `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` and is gitignored** — a committed template (`s3.json.tmpl`) holds `${VAR}` placeholders only. Generating rather than committing it keeps NFR-SEC-12's "0 secrets in source" literally true, and guarantees the gateway and the app can never disagree about the key pair. The hosting ADR replaces this wholesale.
- **Bucket:** `proofdesk-local`, created by the bootstrap script (idempotent `CreateBucket` via the AWS SDK, not a vendor CLI, so there is no extra prerequisite).
- **Health check:** HTTP GET against the master status endpoint (`http://localhost:9333/cluster/status`) with `wget -q -O /dev/null`. **P0-6 must confirm the exact path and that the slim image contains `wget`/`curl`**; if neither is present, use a `service_healthy`-free `depends_on` plus an app-side readiness probe in the dev script rather than inventing a health command.
- **Resources:** ~120–250 MB RSS idle for a dev single node. Image ~270 MB per arch; `linux/amd64` and `linux/arm64` both published (confirmed from the Docker Hub tag payload), so Apple Silicon runs native.
- **S3 compatibility we rely on:** `PutObject`, `GetObject`, `HeadObject`, `DeleteObject`, multipart upload, and **presigned PUT/GET (SigV4)**. SeaweedFS documents presigned URL and multipart support. **Known gap:** browser-based *presigned POST policy* uploads have reported 405 responses. Our design uses **presigned PUT**, which is the supported path — but P0-6 must include a throwaway integration test that presigns a PUT, uploads a 50 MB file from a browser, and presigns a GET with `response-content-disposition`. If presigned PUT fails, escalate rather than redesigning silently.

#### mailpit
- **Why Mailpit and not MailHog:** MailHog is unmaintained; Mailpit is actively released (a security fix shipped 2026-11-17), is MIT, and exposes a **REST API** (`GET /api/v1/messages`, `GET /api/v1/message/{id}`) that Playwright can assert against. That API is what makes guest-link and OTP E2E tests possible without a real mail provider.
- **Health check:** Mailpit ships `/readyz`; use `wget -q -O /dev/null http://localhost:8025/readyz`. P0-6 confirms the path against the pinned version's docs.
- **Resources:** ~20 MB. Negligible.
- **Dev rule:** every environment variable that could send real mail is absent locally. `EMAIL_DRIVER=smtp` + `SMTP_HOST=127.0.0.1` means mail physically cannot leave the laptop.

#### clamav (opt-in)
- **Why opt-in:** the ClamAV docs state clamd needs **3 GiB minimum, 4 GiB preferred** (≈1.2 GiB for signature load, doubled transiently during a database reload). That is more RAM than the rest of the stack combined and more than most Docker Desktop defaults allocate. Making it always-on would make `dev:up` fail or thrash on a 16 GB laptop running an editor, a browser and Next.
- **Therefore:** `profiles: ["scan"]`. Day-to-day dev runs `SCAN_DRIVER=noop`. `docker compose --profile scan up -d` plus `SCAN_DRIVER=clamav` runs the real thing. CI runs the real thing in a dedicated non-required job (§7).
- **This does not weaken the invariant.** The `pending_scan → clean | infected` state machine, the "only `clean` is served" check and both its allowed-path and denied-path tests run against the **`noop` adapter with injected verdicts** on every CI run. The real ClamAV job only proves the adapter talks to clamd correctly. The product rule is tested continuously; the integration is tested on a schedule. See Q2.
- **Signatures:** the standard (non-`_base`) tags ship with preloaded signature databases, which is what we want — first start works offline-ish and does not block on a ~1 GB freshclam download. Persist `/var/lib/clamav` so subsequent freshclam updates survive restarts. Note: freshclam always runs at least once at startup if no database is present, so never start a `_base` tag with an empty volume while offline.
- **Health check:** `clamdcheck.sh` is shipped in the image; `test: ["CMD","clamdcheck.sh"]` with `start_period: 180s` (signature load is slow). Do not shorten `start_period`.
- **Architecture:** P0-6 must confirm `linux/arm64` is published for the pinned tag before committing it; if not, add `platform: linux/amd64` and accept the emulation cost, and raise it as a risk.

### 1.3 Services deliberately not added

| Not added | Why | What we do instead |
|---|---|---|
| Redis / Valkey | ADR-0002 names no cache or Redis-backed rate limiter. Adding one is a new dependency and a new failure mode. | OTP attempt counters and request rate limits live in Postgres rows with timestamps. Single-node local and a pilot-sized deployment do not need more. If load ever justifies Redis, that is a hosting-ADR decision. |
| A jobs service | pg-boss is a library over Postgres. | Worker is a host process (`npm run worker`). |
| App container / Dockerfile | Nothing deploys in Phase 1, and a dev Dockerfile would be a second, divergent way to run the app. | Host `next dev`. The hosting ADR owns the production image, if there is one. |
| Reverse proxy (Caddy/Traefik) | Only needed for local TLS, and §5 solves that more cheaply. | None. |
| Sentry / observability service | ADR-0002: pino to console locally. | `pino` + `pino-pretty` in dev; `SENTRY_DSN` stays empty. |

---

## 2. `.env.example` variable inventory

This is an **inventory for the plan**. The actual `.env.example` file is written by the bootstrap builder in P0-6, with these names, these comments and these defaults.

**Rules for P0-6:**
1. `.env.example` is the only env file ever committed. `.env`, `.env.local` and `.env.*.local` stay in `.gitignore`.
2. Every secret-shaped variable is committed **empty** (`VAR=`), with a comment saying how to generate it. Never a plausible-looking fake value — a fake that works is a fake that ships.
3. The throwaway local infrastructure credentials (Postgres password, SeaweedFS key pair) are the one exception, and they live **only** in `.env.example`, which NFR-SEC-12 explicitly permits. They are published defaults for services bound to the laptop, identical for every developer, and the file header says exactly that. Nothing credential-shaped is committed anywhere else — notably not in the SeaweedFS identity file (§1.2). They must **never** be reused in any shared environment, and the env schema must reject them when `NODE_ENV=production`.
4. Fail fast: a Zod schema parses `process.env` once at startup and throws with the missing variable names listed. No `process.env.X!` anywhere else in the codebase.
5. Agents read variable **names** from this file only, and never read, print or commit any `.env*` file that is not `.env.example`.

Legend: **R** = required for the app to boot, **O** = optional.

### 2.1 Runtime and app identity

| Variable | R/O | Purpose | Local default |
|---|---|---|---|
| `NODE_ENV` | R | Standard Node/Next mode | `development` |
| `APP_URL` | R | Canonical origin used in emails, guest links and presigned-URL hosts. **Must be changed for LAN/tunnel phone testing** (§5). | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | R | Same value exposed to the browser bundle | `http://localhost:3000` |
| `PORT` | O | Next dev/start port | `3000` |
| `LOG_LEVEL` | O | pino level | `debug` |
| `LOG_PRETTY` | O | pino-pretty in dev, JSON in CI | `true` |
| `TZ` | O | Container/process timezone. Keep UTC so timezone-aware display (§7.5) is exercised rather than accidentally correct. | `UTC` |

### 2.2 Database

| Variable | R/O | Purpose | Local default |
|---|---|---|---|
| `DATABASE_URL` | R | App connection string, using the **non-owner, non-BYPASSRLS** app role | `postgresql://proofdesk_app:proofdesk_local_dev@127.0.0.1:5432/proofdesk` |
| `DATABASE_MIGRATION_URL` | R | Owner role used only by the migration runner | `postgresql://proofdesk:proofdesk_local_dev@127.0.0.1:5432/proofdesk` |
| `DATABASE_SSL` | O | Enable TLS to Postgres | `false` |
| `DATABASE_POOL_MAX` | O | Pool ceiling | `10` |
| `TEST_DATABASE_DRIVER` | O | `pglite` for unit tests, `postgres` for integration | `pglite` |

Use `127.0.0.1`, not `localhost`. Modern Node resolves `localhost` to `::1` first on macOS; a container publishing on `0.0.0.0` can produce `ECONNREFUSED` that looks like Postgres being down.

### 2.3 Professional auth (Better Auth)

| Variable | R/O | Purpose | Local default |
|---|---|---|---|
| `BETTER_AUTH_SECRET` | R | Session/cookie signing key | *(empty — generated by `npm run env:init`)* |
| `BETTER_AUTH_URL` | R | Better Auth base URL; must equal `APP_URL` | `http://localhost:3000` |
| `BETTER_AUTH_TRUSTED_ORIGINS` | R | Comma-separated allowed origins. Add the LAN IP or tunnel host for phone testing. | `http://localhost:3000` |
| `AUTH_COOKIE_SECURE` | O | `Secure` flag on session cookies. `false` only because local dev is plain HTTP. | `false` |
| `AUTH_SESSION_MAX_AGE_SECONDS` | O | Professional session lifetime | `604800` |
| `AUTH_EMAIL_VERIFICATION_REQUIRED` | O | Professional sign-up email verification (§6.4 professional screen 1) | `true` |

### 2.4 Guest access links and OTP

Numeric policy values below are **placeholders carrying the figures already fixed by NFR-SEC-3 and ADR-0002** (6-digit code, 10-minute validity, max 5 attempts, per-identity rate limit). The per-endpoint rate-limit thresholds of NFR-SEC-6 are marked `OPEN` in the SRS, so the values here are placeholders awaiting the domain/authorization ADR (P0-3). This plan does not set product policy; it only guarantees the values are configurable rather than hard-coded.

| Variable | R/O | Purpose | Local default |
|---|---|---|---|
| `GUEST_TOKEN_PEPPER` | R | Server-side pepper mixed into the hash of guest link tokens, so a DB leak alone does not yield usable links | *(empty — generated)* |
| `GUEST_SESSION_SECRET` | R | Signing key for the HttpOnly guest session cookie. Separate from `BETTER_AUTH_SECRET` so professional and guest sessions cannot be confused or cross-forged. | *(empty — generated)* |
| `GUEST_SESSION_TTL_MINUTES` | O | Verified guest session lifetime | `60` |
| `GUEST_OTP_TTL_SECONDS` | O | OTP validity (ADR-0002: 10 min) | `600` |
| `GUEST_OTP_MAX_ATTEMPTS` | O | Wrong-code attempts before lockout (ADR-0002: 5) | `5` |
| `GUEST_OTP_RATE_WINDOW_SECONDS` | O | Rate-limit window for OTP requests | `900` |
| `GUEST_OTP_MAX_REQUESTS_PER_WINDOW` | O | OTP sends allowed per window per recipient | `5` |
| `GUEST_LINK_DEFAULT_TTL_DAYS` | O | Default link expiry where expiry is implemented (§7.2) | `30` |

### 2.5 Storage adapter

| Variable | R/O | Purpose | Local default |
|---|---|---|---|
| `STORAGE_DRIVER` | R | `s3` \| `memory` (tests) | `s3` |
| `STORAGE_ENDPOINT` | R | S3 endpoint the **server** uses | `http://127.0.0.1:8333` |
| `STORAGE_PUBLIC_ENDPOINT` | R | Endpoint that presigned URLs are signed against, i.e. what the **browser or phone** must be able to reach. Differs from `STORAGE_ENDPOINT` during LAN/tunnel testing. | `http://127.0.0.1:8333` |
| `STORAGE_REGION` | R | SigV4 region label; arbitrary but must match both sides | `us-east-1` |
| `STORAGE_BUCKET` | R | Bucket name | `proofdesk-local` |
| `STORAGE_FORCE_PATH_STYLE` | R | Path-style addressing (required for non-AWS endpoints) | `true` |
| `STORAGE_ACCESS_KEY_ID` | R | Local throwaway key, matches `docker/seaweedfs/s3.json` | `proofdesk_local` |
| `STORAGE_SECRET_ACCESS_KEY` | R | Local throwaway secret, matches the same file | `proofdesk_local_dev_secret` |
| `STORAGE_UPLOAD_URL_TTL_SECONDS` | O | Presigned PUT lifetime | `300` |
| `STORAGE_DOWNLOAD_URL_TTL_SECONDS` | O | Presigned GET lifetime. **NFR-SEC-5 caps this at 300 seconds**, because a presigned GET cannot be revoked individually (ADR-0002) — the env schema must reject any value above 300. | `120` |

### 2.6 Product limits (operating defaults B6)

| Variable | R/O | Purpose | Local default |
|---|---|---|---|
| `MAX_UPLOAD_BYTES` | R | 50 MB per file | `52428800` |
| `MAX_PDF_PAGES_FOR_REVIEW` | R | 50 pages for in-browser review. Per NFR-LIM-2 the file above this count becomes **download-only with a clear state**, not an error — the variable name says `FOR_REVIEW` to keep that distinction visible. | `50` |
| `WORKSPACE_SOFT_QUOTA_BYTES` | R | 5 GB soft quota per workspace | `5368709120` |
| `ALLOWED_UPLOAD_MIME_TYPES` | O | Server-side allow-list; extensions are never trusted (§7.4) | `application/pdf,image/png,image/jpeg,image/webp` |

### 2.7 Email adapter

| Variable | R/O | Purpose | Local default |
|---|---|---|---|
| `EMAIL_DRIVER` | R | `smtp` \| `console` \| `memory` (tests) | `smtp` |
| `SMTP_HOST` | R when `smtp` | Mailpit host | `127.0.0.1` |
| `SMTP_PORT` | R when `smtp` | Mailpit SMTP port | `1025` |
| `SMTP_SECURE` | O | TLS to the SMTP server | `false` |
| `SMTP_USER` | O | Mailpit needs none | *(empty)* |
| `SMTP_PASSWORD` | O | Mailpit needs none | *(empty)* |
| `EMAIL_FROM` | R | From header. `.local` TLD makes accidental real delivery impossible. | `ProofDesk <no-reply@proofdesk.local>` |
| `EMAIL_REPLY_TO` | O | Reply-to header | *(empty)* |
| `MAILPIT_API_URL` | O | Used by E2E tests to read the inbox | `http://127.0.0.1:8025` |

### 2.8 Malware scanning adapter

| Variable | R/O | Purpose | Local default |
|---|---|---|---|
| `SCAN_DRIVER` | R | `clamav` \| `noop` | `noop` |
| `CLAMAV_HOST` | R when `clamav` | clamd host | `127.0.0.1` |
| `CLAMAV_PORT` | R when `clamav` | clamd TCP port | `3310` |
| `CLAMAV_TIMEOUT_MS` | O | Per-scan timeout; a 50 MB PDF needs headroom | `120000` |
| `SCAN_REQUIRED_BEFORE_SERVE` | R | Hard gate: only `clean` versions get a download URL. **Never `false` in any shared environment**; the env schema should refuse `false` unless `NODE_ENV=test`. | `true` |

### 2.9 Worker and jobs

| Variable | R/O | Purpose | Local default |
|---|---|---|---|
| `WORKER_ENABLED` | R | Whether this process runs pg-boss workers | `true` |
| `PGBOSS_SCHEMA` | O | Isolate queue tables from the domain schema | `pgboss` |
| `PGBOSS_DATABASE_URL` | O | Defaults to `DATABASE_URL`. pg-boss needs DDL rights on its own schema, so this may need the owner role. | *(empty)* |
| `REMINDER_SCHEDULE_CRON` | O | Reminder sweep cadence. The **rule** is product (§8.1); this is only when the sweep runs. | `0 9 * * *` |

### 2.10 Observability, testing and dev conveniences

| Variable | R/O | Purpose | Local default |
|---|---|---|---|
| `LOG_REDACT_PATHS` | R | pino `redact` path list. **NFR-SEC-2 requires no plaintext guest token at rest or in logs, and NFR-OBS-1 requires the audit-relevant log lines to carry no secrets or tokens.** Redaction must be configured at the logger, not remembered at each call site. | `req.headers.cookie,req.headers.authorization,token,otp,code,password,secret` |
| `SENTRY_DSN` | O | Empty locally; populated only after a hosting ADR | *(empty)* |
| `E2E_BASE_URL` | O | Playwright target | `http://127.0.0.1:3000` |
| `SEED_DEMO_DATA` | O | Whether `dev:up` seeds the demo workspace. Guarded to refuse unless `NODE_ENV=development`. | `true` |
| `SEED_RANDOM_SEED` | O | Deterministic fixture IDs so screenshots and tests are stable | `proofdesk-dev` |

---

## 3. Adapter interfaces

Three ports keep the hosting ADR a configuration change. Shapes only — P0-6/Wave 1 implements them.

**Placement:** `src/server/ports/*.ts` holds the interfaces and types. `src/server/adapters/<port>/<driver>.ts` holds implementations. A single `src/server/adapters/index.ts` factory reads the `*_DRIVER` env var and returns the port. **Domain and application code imports only the port type**, never an adapter, never `@aws-sdk/*`, never `nodemailer`. An ESLint `no-restricted-imports` rule should enforce that boundary, because this is exactly the rule that erodes quietly.

### 3.1 `StoragePort`

```ts
/** Server-generated, tenant-prefixed. Never derived from client input. */
type StorageKey = string;

type PresignedUpload = {
  url: string;
  method: 'PUT';
  headers: Record<string, string>; // e.g. Content-Type, checksum headers
  expiresAt: Date;
};

interface StoragePort {
  createUploadUrl(input: {
    key: StorageKey;
    contentType: string;
    contentLength: number;
    checksumSha256?: string;
  }): Promise<PresignedUpload>;

  createDownloadUrl(input: {
    key: StorageKey;
    expiresInSeconds?: number;
    downloadFilename?: string;
  }): Promise<{ url: string; expiresAt: Date }>;

  /** Worker-side only: scanning, page-count checks, preview rendering. */
  getObjectStream(key: StorageKey): Promise<ReadableStream<Uint8Array>>;

  putObject(input: {
    key: StorageKey;
    body: Uint8Array | ReadableStream<Uint8Array>;
    contentType: string;
  }): Promise<{ etag: string; sizeBytes: number }>;

  headObject(key: StorageKey): Promise<
    { sizeBytes: number; contentType: string; etag: string } | null
  >;

  /** Retention only. Must never be reachable from a request handler. */
  deleteObject(key: StorageKey): Promise<void>;
}
```

Contract rules:
- **The adapter performs no authorization.** Callers hand it keys they have already authorized. Keeping authorization out of the adapter is what lets the hosting ADR swap the adapter without a security re-review.
- **Key layout:** `w/{workspaceId}/a/{assetId}/v/{assetVersionId}/{sanitizedFilename}`. Workspace-first so a bucket policy or prefix-scoped credential can enforce tenancy later (invariant 1), and `assetVersionId`-addressed so bytes are immutable (invariant 3).
- **No `listObjects`.** Nothing in the domain should enumerate a bucket; the database is the index (invariant 13). Admin/backup scripts may list, outside the port.
- `createDownloadUrl` is called **after** the authorization check and after the scan gate, never before.
- Drivers: `s3` (`@aws-sdk/client-s3` 3.x + `@aws-sdk/s3-request-presigner` 3.x, both Apache-2.0 — version `3.1176.0` confirmed on the npm registry) against SeaweedFS locally and S3/R2 later; `memory` for unit tests.

### 3.2 `EmailPort`

```ts
type EmailAddress = { email: string; name?: string };

interface EmailPort {
  send(message: {
    to: EmailAddress[];
    subject: string;
    html: string;
    text: string;          // required, not optional — plain-text fallback always ships
    from?: EmailAddress;
    replyTo?: EmailAddress;
    headers?: Record<string, string>;
    /** Stable per (event, recipient) so retries cannot double-send. */
    idempotencyKey: string;
  }): Promise<{ providerMessageId: string; acceptedAt: Date }>;
}
```

Contract rules:
- **Sending never happens inline with a domain write.** The domain action commits, writes its `ActivityEvent`, and enqueues a pg-boss job. A delivery failure must not undo a persisted comment, publication or approval (§8.2, invariant 13).
- Delivery attempts, failures and provider IDs live in their own table, separate from domain state.
- Recipient selection is done by the caller against current authorization, never by the adapter (§8.1: do not notify people who no longer have access).
- Drivers: `smtp` (`nodemailer` 10.x, MIT-0, confirmed on the npm registry) → Mailpit now, a provider later; `console` for scripts; `memory` for unit tests. React Email renders the `html`/`text` pair and is driver-agnostic.

### 3.3 `ScannerPort`

```ts
type ScanVerdict =
  | { status: 'clean' }
  | { status: 'infected'; signature: string }
  /** Transient: scanner unreachable, timed out, or oversized. Not a verdict. */
  | { status: 'error'; reason: string };

interface ScannerPort {
  scanStream(
    stream: ReadableStream<Uint8Array>,
    meta: { sizeBytes: number; declaredContentType: string },
  ): Promise<ScanVerdict>;

  ping(): Promise<boolean>;
}
```

Contract rules:
- Three-valued on purpose. `error` is **not** `clean` and **not** `infected`: the version stays `pending_scan` and the job retries with backoff. Collapsing `error` into either value is the bug that either serves malware or deletes a client's file.
- Only `clean` permits `createDownloadUrl`. Enforced in one service function with an allowed-path test (clean → URL issued) and a denied-path test (`pending_scan` and `infected` → 403, no URL), per the project profile's G2/G3 rule.
- `infected` must not delete the uploaded bytes silently: mark the version, notify the uploading professional, and keep the record (invariant 14, §7.4 "do not silently delete").
- Drivers: `clamav` (clamd `INSTREAM` over TCP) and `noop` (returns `clean`, or an injected verdict in tests). See Q6 for the clamd client choice.

### 3.4 What is deliberately not an adapter

No `ClockPort`, no `IdPort`, no generic `QueuePort`. pg-boss is already a thin library over the database we are committed to, and the other two are abstraction for its own sake. YAGNI.

---

## 4. Local backup and restore

Purpose: let a developer snapshot a working state before a destructive migration, and rehearse the restore drill that §7.4 will require for real before GA. All of this is a few npm scripts, no service, no account.

### 4.1 Ordering rule (read this first)

Take the **object-store snapshot before the database dump**, and restore in the same order.

Asset bytes are immutable and append-only. A snapshot pair where the object store is *newer* than the database contains orphan objects, which are harmless. A pair where the database is newer than the object store contains `AssetVersion` rows pointing at bytes that do not exist, which breaks the review canvas and any approval evidence that references them. Never the second one.

### 4.2 Postgres

```bash
# snapshot — always exec inside the container so client and server versions match
docker compose exec -T postgres \
  pg_dump -U proofdesk -d proofdesk -Fc > ".backups/pg/$(date -u +%Y%m%dT%H%M%SZ).dump"

# restore
docker compose exec -T postgres \
  pg_restore -U proofdesk -d proofdesk --clean --if-exists < ".backups/pg/<stamp>.dump"
```

Wrapped as `npm run db:backup` and `npm run db:restore -- <stamp>`. A host-installed `psql`/`pg_dump` from a different major version will refuse or produce a non-restorable dump — the scripts must never call the host binaries.

### 4.3 Object storage

Two methods, both offered:

1. **Volume snapshot (fast, local-only).** Tar the named volume through a throwaway container:
   `docker run --rm -v proofdesk_seaweeddata:/data -v "$PWD/.backups:/b" alpine tar czf /b/objects-<stamp>.tgz -C /data .`
   Requires the stack to be stopped, is backend-specific, and is the right tool for "snapshot before I run this migration".
2. **Logical sync (portable).** A small Node script using `@aws-sdk/client-s3` that walks the bucket and copies objects to `.backups/objects/<stamp>/`, and back. Slower, but it is the same script that will work against S3 or R2 later, and it needs **no extra prerequisite** (no `aws` CLI, no `rclone`) — see Q8.

`npm run objects:backup` / `objects:restore` pick method 1 by default and method 2 with `--logical`.

### 4.4 `.backups/` hygiene

- `.backups/` is in `.gitignore`. It is never committed, never attached to a PR, never pasted into an issue.
- In Phase 1 it contains only locally generated demo data. The moment any real studio or client data exists, backups become human-owned per operating default #2 (customer/personal data: human approval in every environment), and agents stop touching them.
- No retention policy is defined here; developers prune by hand. Retention for real data is a hosting-ADR decision (B7).

### 4.5 Seed and demo data

- `npm run db:seed` is **idempotent** and uses deterministic IDs derived from `SEED_RANDOM_SEED`. Re-running it must not duplicate the demo workspace. Stable IDs keep Playwright selectors and screenshot diffs from churning.
- It refuses to run unless `NODE_ENV=development` and `SEED_DEMO_DATA=true`.
- It seeds exactly the §10.1 acceptance scenario's cast: one workspace with an Owner and a Member, one project, one client contact, one confirmed brief, one published submission with two asset versions, one open feedback thread, one activity trail. Enough to walk the 11 steps by hand.
- **Fixtures:** commit a small (<1 MB) 3-page A3 PDF and two images under `fixtures/`. The large A1/A0 PDF needed for the ADR-0002 week-1 viewer spike is **generated locally** by a script and gitignored — do not put a 40 MB binary in git history.
- **EICAR:** the malware-detection test file is **generated at test time from its string form**, never committed. A committed EICAR file trips the developer's own macOS antivirus and GitHub's scanners, and is a reliable way to make a clone fail.
- `npm run db:reset` = stop stack, drop the `pgdata` and `seaweeddata` volumes, up, migrate, seed. One command, destructive, prints a confirmation prompt.

### 4.6 The drill

Before G0 closes, run the drill once and record the evidence on the P0-6 PR: seed → backup → `db:reset` → restore → the seeded submission still renders and its approval history is intact. §7.4 requires tested restoration; doing it now, locally, means the hosting ADR inherits a rehearsed procedure instead of a hope.

---

## 5. Phone testing at 375 px

The project profile requires phone-width evidence for client-facing screens (G3), and ADR-0002 requires a real-iPhone check of a large architecture PDF before any viewer feature work. Those are two different needs.

**Separate them:**

- **Routine 375 px evidence (G3)** comes from **Playwright mobile WebKit emulation** against `http://127.0.0.1:3000`. Deterministic, scriptable, CI-attachable, zero setup. This satisfies the G3 evidence requirement for every client-facing ticket.
- **Real-device checks** — the pdf.js spike, pinch-zoom and pin placement with an actual thumb, iOS Safari quirks — need a real phone pointed at the laptop. Emulation cannot prove canvas memory limits or touch latency.

### 5.1 Option A — LAN IP over HTTP (the default)

Run `next dev -H 0.0.0.0`, find the Mac's address with `ipconfig getifaddr en0`, and open `http://192.168.x.x:3000` on the phone.

Required changes per session, all env-driven, which is why §2 insists these are variables:
- `APP_URL` / `NEXT_PUBLIC_APP_URL` → `http://192.168.x.x:3000` (otherwise guest links in Mailpit point at the phone's own `localhost`)
- `BETTER_AUTH_URL` and `BETTER_AUTH_TRUSTED_ORIGINS` → the same origin
- `STORAGE_PUBLIC_ENDPOINT` → `http://192.168.x.x:8333` (otherwise presigned URLs are unreachable from the phone and every asset 404s — this is the single most common failure in this setup)
- Next 16 requires the LAN origin in `allowedDevOrigins` in `next.config.ts`, or dev asset requests are rejected as cross-origin. P0-6 should read this from an env var.

**HTTPS and cookie implications:**
- **NFR-SEC-7 requires HTTPS everywhere outside the local Docker Compose loopback. A LAN IP is not loopback.** Option A is therefore a narrow, session-scoped exception, and it is only defensible because NFR-ENV-3 forbids real client data in any local or tunnelled session — the only thing traversing the LAN is generated demo data. P0-6 should make that structural: the `dev:lan` script refuses to bind `0.0.0.0` unless `NODE_ENV=development` and the demo seed is the only data present. See Q5.
- No TLS. `Secure` cookies will not be set, so `AUTH_COOKIE_SECURE=false` and the guest session cookie must be non-`Secure` locally. This means local dev **does not exercise the production cookie configuration**, which is a real gap — record it as a hosting-ADR acceptance test rather than pretending the local path proves it.
- No secure context, so clipboard-write, service workers and any `getUserMedia` path are unavailable. None are in Phase 1 scope; if a ticket wants copy-to-clipboard on the guest link, it needs Option B or C to test.
- `SameSite=Lax` behaves normally; nothing in Phase 1 needs `SameSite=None`, and if something ever does, it requires `Secure`, which requires Option B or C.

**Pitfalls:** the macOS firewall prompts on first bind and must be allowed; many home and all office/guest Wi-Fi networks enable client isolation, which silently blocks this; the Mac and phone must be on the same subnet and band.

### 5.2 Option B — mkcert local CA over LAN (when HTTPS behaviour matters)

`mkcert` (BSD-3-Clause, FiloSottile/mkcert, not archived; last push 2024-08 — a stable, low-churn tool) issues a locally trusted cert for the LAN IP. Next can serve it with `next dev --experimental-https`. Gives real HTTPS, so `Secure` cookies and secure context work, with no public exposure.

Cost: the mkcert root CA must be installed **and explicitly trusted** on the iPhone (install the profile, then Settings → General → About → Certificate Trust Settings → enable). That is a multi-step manual device change per phone, and it has to be redone when the CA rotates. Worth it once, for a cookie-behaviour session; too much friction for daily use.

### 5.3 Option C — Cloudflare quick tunnel (for the real-device spike)

`cloudflared tunnel --url http://localhost:3000` (Apache-2.0, confirmed via the GitHub license API) needs **no account and no payment** and returns a `https://<random>.trycloudflare.com` URL with a publicly valid certificate. Real HTTPS, real secure context, `Secure` cookies work, and it reaches a phone on cellular.

Costs and implications:
- The hostname is **random on every start**, so `APP_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`, `allowedDevOrigins` and `STORAGE_PUBLIC_ENDPOINT` must all be re-set per session. A `npm run dev:tunnel` script should parse the hostname from cloudflared's output and export it.
- Presigned storage URLs need the object store exposed too, which means a **second** tunnel and a second hostname. This is the main reason it is not the default.
- The URL is **public and unauthenticated at the edge**. ADR-0002 already states tunnels are for test sessions only and never with real client data. Add two guards: the tunnel script refuses to start unless `NODE_ENV=development`, and it refuses if `SEED_DEMO_DATA` is not the only data source.
- Latency and reliability are not guaranteed, so it is a poor instrument for judging viewer performance — which is precisely what the spike measures. Measure performance on Option A; use Option C only for HTTPS-dependent behaviour.
- ngrok is rejected: the free tier requires an account, and B1 says no accounts.

### 5.4 Recommendation

**Default to Option A (LAN IP over HTTP)**, add **Option C behind a `dev:tunnel` script** for the occasional HTTPS-dependent check, and treat **Option B as a documented one-off** for the cookie-configuration session. Rationale: Option A is zero-setup, zero-exposure, and gives honest performance numbers for the pdf.js spike, which is the main real-device need; Option C's hostname churn and dual-tunnel requirement make it a poor daily driver; Option B's per-device trust ceremony does not pay for itself more than once. The cookie-and-secure-context gap is real, so it is recorded as a hosting-ADR acceptance test rather than papered over.

Debugging on device: Safari Web Inspector over USB (Settings → Apps → Safari → Advanced → Web Inspector, then Mac Safari → Develop) works with all three options and needs no tunnel.

---

## 6. Developer setup path

### 6.1 Prerequisites

| Prerequisite | Version | Notes |
|---|---|---|
| Docker | Docker Desktop 4.x, OrbStack or Colima | Compose V2 (`docker compose`, not `docker-compose`). **Allocate ≥ 8 GB to the VM, ≥ 12 GB if running the `scan` profile.** Docker Desktop's default is often 8 GB, which is not enough with ClamAV. |
| Node.js | **24 LTS** (Next 16 requires ≥ 20.9.0; TypeScript ≥ 5.1) | Pinned in `.nvmrc` and `package.json#engines`. See Q4. |
| Package manager | Whatever the `ixartz/SaaS-Boilerplate` fork ships, pinned via `package.json#packageManager` + Corepack | Do not migrate it in P0-6. See Q7. |
| Git | 2.4x | Worktrees are used per ticket |
| `cloudflared` | latest | **Optional**, only for Option C phone testing |
| `mkcert` | latest | **Optional**, only for Option B |

No `aws` CLI, no `rclone`, no `psql`, no `pnpm dlx` of a remote tool. Everything else is a repo-owned dependency.

### 6.2 Clean clone to running app

```bash
git clone git@github.com:khalidsohaibrana/proofdesk.git && cd proofdesk
nvm use                 # reads .nvmrc
npm ci                  # or the fork's lockfile-exact equivalent
cp .env.example .env.local
npm run env:init        # generates the three local secrets into .env.local
npm run dev:up          # <- the one command
```

`npm run dev:up` does, in order:
1. assert prerequisites — Docker daemon reachable, Node major matches `.nvmrc`, `.env.local` present
2. validate `.env.local` against the Zod env schema and fail with the list of missing names
3. `docker compose up -d --wait` (Postgres, SeaweedFS, Mailpit; ClamAV only with `--profile scan`)
4. ensure the `proofdesk-local` bucket exists (idempotent, via the AWS SDK)
5. run Drizzle migrations with `DATABASE_MIGRATION_URL`, including the first migration that creates the non-owner app role and enables RLS
6. seed demo data if `SEED_DEMO_DATA=true`
7. start `next dev` and the pg-boss worker together, with interleaved prefixed logs
8. print the three URLs: app `http://localhost:3000`, Mailpit `http://localhost:8025`, object store `http://localhost:8333`

Supporting scripts: `dev:down` (stop, keep data), `dev:reset` (destroy volumes and re-seed), `dev:logs`, `dev:tunnel`, `db:backup`, `db:restore`, `objects:backup`, `objects:restore`, `db:seed`, `test`, `test:e2e`.

`npm run env:init` must **write** generated values and never print them to stdout, so that an agent running it cannot leak a secret into a transcript or a PR comment.

### 6.3 Known platform pitfalls (macOS first)

| Pitfall | Symptom | Fix |
|---|---|---|
| `localhost` resolves to `::1` | Intermittent `ECONNREFUSED` to Postgres or the object store that looks like the container being down | Use `127.0.0.1` in every connection string (already in §2) |
| Docker Desktop memory too low | ClamAV OOM-killed during signature load, or the whole stack stalls | Raise the VM to ≥ 12 GB when using `--profile scan`, or stay on `SCAN_DRIVER=noop` |
| macOS AirPlay Receiver holds ports 5000 and 7000 | Not our ports, but a frequent cause of "it works for me" when someone reassigns | Keep the documented ports; never move a service to 5000/7000 |
| Port 3000 already taken | `next dev` picks 3001 and every `APP_URL`-derived link breaks | Set `PORT` explicitly and keep `APP_URL` in sync; the dev script should fail loudly rather than drift |
| Apple Silicon image availability | `exec format error`, or silent QEMU emulation at a 3–10× slowdown | SeaweedFS and Postgres publish arm64. **P0-6 must confirm arm64 for the pinned ClamAV tag** and add `platform:` only if forced |
| Bind-mount I/O | Slow dev server if the app is containerised | The app runs on the host; only infra is in Compose (§1.0) |
| Host `pg_dump` version mismatch | Dump refuses or restores badly | Always `docker compose exec` (§4.2) |
| macOS firewall prompt on `-H 0.0.0.0` | Phone cannot reach the LAN IP | Allow the incoming connection once |
| Git worktrees and `.env.local` | A new worktree has no `.env.local` and `dev:up` fails confusingly | `dev:up` prints the exact `cp .env.example .env.local && npm run env:init` remedy. Ports are shared across worktrees, so **only one worktree runs the stack at a time** — document this, as it directly affects parallel builders |

**Parallel-builder note:** with up to 5 builders in worktrees, the fixed host ports mean the Compose stack is a shared, single-instance resource. Keep it that way for Phase 1 — a `COMPOSE_PROJECT_NAME` + port-offset scheme per worktree is solvable but is complexity nobody has asked for. Unit tests use PGlite and in-memory adapters, so builders can run the full required CI check set concurrently without the stack at all. That is the real answer, and it is another reason to keep the required checks service-free.

---

## 7. CI dependency implications

Operating default A12 and NFR-OBS-5: CI starts with **lint, typecheck and unit tests** required, with E2E, accessibility and coverage added by Wave 2.

### 7.1 What the required checks need

**Nothing.** No service containers, no repository secrets, no network beyond the package registry.

| Check | Services | How |
|---|---|---|
| lint, format | none | ESLint + Prettier, including the `no-restricted-imports` rule that keeps adapters out of domain code (§3) |
| typecheck | none | `tsc --noEmit` |
| unit tests | none | **PGlite** (Postgres compiled to WASM, Apache-2.0, already in the chosen boilerplate) for database tests; `memory` StoragePort; `memory` EmailPort; `noop` ScannerPort with injected verdicts |

Keeping the required set service-free is a deliberate goal: fast feedback, no flaky container startup, and no secrets in CI while the project is local-only.

**PGlite caveat to verify in P0-6:** the invariant tests depend on RLS policies and on UPDATE/DELETE-rejecting triggers behaving under a non-owner role. PGlite is real Postgres, so both should work, but **P0-6 must prove it with one test that creates the app role, enables RLS, and confirms a cross-workspace read returns zero rows**. If PGlite cannot switch roles convincingly, the tenancy tests move to a Postgres service container and the required-check set gains a service. That is a known fork in the road, not a surprise.

### 7.2 What can be faked or substituted, and what cannot

| Dependency | In required checks | In the Wave-2 integration/E2E job | Can it be faked? |
|---|---|---|---|
| Postgres | PGlite, in-process | `services: postgres:17.12-alpine` | Yes for unit tests; **no** for the migration-apply check — migrations must run against real Postgres at least once per PR |
| Object storage | `memory` StoragePort | `chrislusf/seaweedfs:4.55` as a service container | Yes for domain logic; **no** for presigned PUT/GET SigV4 behaviour, which is exactly where a fake lies to you |
| Email | `memory` EmailPort | `axllent/mailpit:v1.34.0` service container; assert via its REST API | Yes for "was a send enqueued"; Mailpit is needed to assert the rendered guest link and OTP that E2E then uses |
| Malware scan | `noop` with injected verdicts | **Not** in the per-PR job | Yes for the product rule. Real ClamAV goes in a **separate, non-required, nightly or label-triggered job** that uploads a generated EICAR file and asserts `infected`, plus a clean PDF asserting `clean`. Rationale: 3–4 GiB RAM and a slow signature load would roughly double per-PR wall time to re-prove an integration that changes almost never |
| pg-boss | in-process, drained synchronously in tests | real worker process in E2E | Yes |
| Phone width (NFR-MOB-1) | Playwright mobile WebKit emulation | the mobile-viewport run NFR-OBS-6 requires | Emulation is the CI answer; real devices are a human, local activity (§5) |
| Accessibility (NFR-A11Y-4) | not in the starting set | axe-core inside the Playwright job | No services of its own; it rides on whatever the E2E job already starts |

### 7.3 CI hygiene notes for P0-6

- Pin every service container to the same digest-backed tag as `docker-compose.yml`. Drift between local and CI is a class of bug nobody enjoys.
- Do not cache ClamAV signatures between runs. Stale signatures are worse than a slow download.
- CI needs **no repository secrets** at all while local-only. If a workflow ever wants one, that is a human-approval event (operating default #2).
- Coverage (A11 / NFR-OBS-3, ≥ 80% on domain/server code) is **measured from the first CI run** inside the unit-test job, and needs no services. It becomes a **required, failing** gate by Wave 2 per NFR-OBS-5 — measure early so the number is never a surprise, enforce when the surface is real.
- The full §5 steps 1–11 E2E suite (NFR-OBS-6) is the reason the Wave-2 job needs all three service containers at once: Postgres for state, SeaweedFS for presigned upload/download, Mailpit for the guest link and OTP the test must read back.

---

## 8. Deferred to the hosting ADR

This plan explicitly does **not** decide any of the following. Each is an input to a future "hosting and vendors" ADR, and several are already-logged open decisions.

1. **Hosting platforms** for the web app and the always-on worker.
2. **Region and data residency** (open decision B4).
3. **Domain**, DNS, and the email sending subdomain with SPF/DKIM/DMARC (open decision B3).
4. **Managed Postgres**, its backup schedule, PITR window, and restore RTO/RPO targets.
5. **Managed object storage**, encryption at rest, bucket policy, lifecycle rules, and whether presigned-GET lifetimes change.
6. **Real email provider** and deliverability posture.
7. **Managed malware scanning** vs a self-run ClamAV worker in production.
8. **Secret manager** and the secret rotation procedure.
9. **Preview environments** and per-PR database branching. Note: P0-6's deliverable line still says "preview deploys", which conflicts with B1 — see Q3.
10. **Error tracking, uptime monitoring and alerting** thresholds (Sentry DSN, smoke tests per operating default #5).
11. **Retention and deletion policy** (open decision B7), including what happens to assets referenced by an approval record.
12. **Production TLS, HSTS, CSP** and the production cookie configuration (`Secure`, `SameSite`, domain scoping) that local HTTP cannot exercise.
13. **Rate-limit backing store** if Postgres-backed counters stop being adequate.
14. **Cost**, billing owner, and subprocessor/DPA list for the pilot agreement (B5).
15. **Cloud account creation** (open decision B2) — always a human action; agents only ever see variable names.

---

## 9. Risks

| # | Risk | Severity | Recommended workaround |
|---|---|---|---|
| R1 | **MinIO named in an Accepted ADR no longer exists as a distributable image** (`minio/minio` Docker Hub repo 404s; community edition archived, security fixes case-by-case) | High — blocks P0-6 | Take ADR-0002's own named fallback, SeaweedFS 4.55 (Apache-2.0). Amend ADR-0002 with one line. See Q1 |
| R2 | **SeaweedFS S3 is not byte-identical to AWS S3.** Presigned POST policy has reported 405 behaviour; presigned PUT is the supported path | Medium | P0-6 ships a throwaway integration test: presign a PUT, upload 50 MB from a browser, presign a GET with `response-content-disposition`. Design uses presigned PUT only. Escalate if it fails rather than redesigning |
| R3 | **Email deliverability cannot be tested locally.** Mailpit proves content, links, OTP and idempotency; it proves nothing about SPF/DKIM/DMARC, reputation or spam placement | Medium, deferred | Accept locally. Make a seed-to-inbox deliverability check an explicit acceptance item of the hosting ADR, before pilot onboarding |
| R4 | **§7.4 requires automated backups with tested restoration before GA.** Locally we have manual scripts only | Medium, deferred | §4 gives real scripts plus a rehearsed restore drill recorded on the P0-6 PR. Automated, monitored backups are a hosting-ADR requirement. No real client data exists locally, so there is nothing yet to lose |
| R5 | **NFR-SEC-7 requires HTTPS outside the local loopback, and LAN-IP phone testing is not loopback.** The production cookie configuration (`Secure`, `SameSite`) is also never exercised locally | Medium | Treat Option A as a session-scoped exception justified by NFR-ENV-3 (demo data only), enforced by a script guard. Use mkcert (Option B) for the one cookie-behaviour session. Record production cookie behaviour as a hosting-ADR acceptance test. The env schema must reject `AUTH_COOKIE_SECURE=false` when `NODE_ENV=production`. **Needs the product owner's explicit nod — Q5** |
| R6 | **ClamAV's 3–4 GiB footprint is hostile to a laptop**, and its signature DB needs internet on first pull | Medium | Opt-in `scan` profile + `SCAN_DRIVER=noop` default; product rule tested continuously with injected verdicts; real integration tested nightly. Use the preloaded-signature tag so first start works without a 1 GB download. See Q2 |
| R7 | **No preview environment**, so QA has no shared URL to review | Medium | QA evidence is local runs plus Playwright artifacts uploaded by CI. P0-6's "preview deploys" line needs removing. See Q3 |
| R8 | **ClamAV is GPL-2.0**, outside the MIT/Apache-2.0/BSD/ISC pre-approval | Low (separate process, never linked or shipped with our code) | Explicit human confirmation. ADR-0002 already names ClamAV, so this is a confirmation rather than a new decision. See Q2 |
| R9 | **`clamscan` npm (MIT) last published 2024-10** — roughly two years stale | Low | It is a thin wrapper over a stable protocol. Either accept it or write ~80 lines of clamd `INSTREAM` client in-repo and take no dependency. See Q6 |
| R10 | **Fixed host ports make the Compose stack a single shared resource** across parallel builder worktrees | Low | Document "one worktree runs the stack". The required CI checks and unit tests need no stack, so parallel builders are not actually blocked |
| R11 | **NFR-ENV-1 names MinIO by name**, so the SRS as well as ADR-0002 is now factually wrong about an accepted dependency | Low, but it is an accepted-document correction | Amend both in the same change as Q1, so no later agent re-adds MinIO from an Accepted document |

---

## 10. Open questions for the product owner

### Blocking (P0-6 cannot start without these)

**Q1. Replace MinIO with SeaweedFS as the local S3-compatible store?**
MinIO's community edition is archived and its Docker Hub repo is gone (verified: the tags API returns 404), so ADR-0002's named primary cannot be used.
(a) **SeaweedFS 4.55, Apache-2.0** — ADR-0002's own named fallback, pre-approved licence, actively released weekly, arm64 native. **Recommended.**
(b) Garage — maintained and purpose-built, but AGPL-3.0, so it needs a licence exception.
(c) LocalStack community S3 — Apache-2.0 core, but a much heavier image aimed at AWS emulation generally, and more moving parts than we need.
**Recommendation: (a)**, with a one-line amendment to **both** ADR-0002's local-replacement table **and SRS NFR-ENV-1**, which also names MinIO. Both are Accepted documents, so leaving either unamended invites a later agent to re-add MinIO on their authority. Approving this also means accepting R2 (SeaweedFS S3 fidelity verified by a P0-6 integration test).

**Q2. ClamAV: GPL-2.0, and opt-in rather than always-on?**
Two things in one question.
(a) **Confirm GPL-2.0 is acceptable** for a separate local container that is never linked into or shipped with our code. ADR-0002 already names ClamAV, so this is most likely already covered — say so and we move on.
(b) Run it **behind an opt-in Compose profile with `SCAN_DRIVER=noop` as the local default**, with the `pending_scan → clean | infected` rule and its allowed/denied-path tests running on every CI run against injected verdicts, and real ClamAV exercised in a nightly job with a generated EICAR file. **Recommended**, because always-on costs 3–4 GiB of laptop RAM to re-prove an integration that almost never changes.
The alternative, always-on, raises the Docker memory floor for every developer and every builder worktree. Dropping local scanning entirely is not recommended: §7.4 expects malware scanning, and the adapter needs at least one real integration test.

**Q3. P0-6 still lists "preview deploys" — remove it?**
It contradicts B1 (local only, no cloud deploys). (a) **Remove it from P0-6 and move it to the hosting ADR; QA evidence comes from local runs plus CI-uploaded Playwright artifacts. Recommended.** (b) Keep it, which requires a hosting account now and reverses B1.

### Non-blocking (defaults are usable; confirm when convenient)

**Q4. Node version pin.** (a) **Node 24 LTS — recommended**, comfortably above Next 16's 20.9.0 floor, broadest tooling support today. (b) Node 26, the newest LTS line — fine, but a slightly thinner ecosystem tail for native-dependency tooling this early. Either way it is one line in `.nvmrc`, and the CI matrix matches it.

**Q5. Confirm the plain-HTTP LAN and tunnel policy against NFR-SEC-7.** NFR-SEC-7 requires HTTPS everywhere outside the local Compose loopback, and a LAN IP is not loopback — so Option A technically sits outside it. NFR-ENV-3 already forbids real client data in any local or tunnelled session, which is what makes it safe. (a) **Accept plain-HTTP LAN testing as a session-scoped exception to NFR-SEC-7, enforced by script guards (`NODE_ENV=development` and demo-seed-only) — recommended**, and note it in the SRS beside NFR-SEC-7 so it is a recorded exception rather than a quiet breach. (b) Require mkcert HTTPS (Option B) for all real-device testing, which is defensible but adds a per-device certificate-trust ceremony before any phone evidence can be captured.

**Q6. clamd client: `clamscan` npm or ~80 lines in-repo?** (a) `clamscan` 2.4.0, MIT, battle-tested, last published 2024-10 (stale). (b) A small in-repo `INSTREAM` client: no dependency, no staleness, fully unit-testable against a fake socket, and the clamd wire protocol has been stable for years. **Recommendation: (b)**, narrowly — our `ScannerPort` needs two of `clamscan`'s many features, and a stale dependency in the malware-scanning path is the wrong place to carry risk. Happy to take (a) if you prefer a named library.

**Q7. Package manager.** Use whatever the `ixartz/SaaS-Boilerplate` fork ships, pinned via `packageManager` + Corepack, and do not migrate it in P0-6. **Recommended** — a package-manager migration inside the bootstrap PR makes that PR unreviewable.

**Q8. Backup tooling prerequisite.** (a) **A small Node script using the AWS SDK we already depend on — recommended**, because it adds no prerequisite and the same script works against S3 later. (b) Require the `aws` CLI or `rclone`, which is faster to write and one more thing every developer and agent must install.

---

## 11. Tickets this plan unblocks

| Unblocks | Because |
|---|---|
| **P0-6 bootstrap** | Has the exact pinned images, ports, volumes, health checks, the full `.env.example` name list, the script inventory and the required-check set. Should split into reviewable parts: (i) fork + strip, (ii) `docker-compose.yml` + `.env.example` + `dev:up`, (iii) CI workflow with the A12 check set, (iv) backup/seed scripts |
| **Wave 1 walking skeleton** | `DATABASE_URL` + the non-owner app role + RLS-from-migration-one is settled, so auth and tenancy tickets can start without an infra decision |
| **Parallel lanes** | The three ports in §3 are the seam. One builder can implement `StoragePort`'s `s3` driver while another builds the upload UI against the `memory` driver, and a third builds notification templates against the `memory` `EmailPort`. None of them block on the others |
| **Viewer spike (ADR-0002 week 1)** | §5's Option A plus the gitignored large-PDF generator give it an environment, a method and a device path |
| **Scanner tickets** | The three-valued `ScanVerdict` and the `SCAN_REQUIRED_BEFORE_SERVE` gate define the allowed-path and denied-path tests the project profile requires at G2/G3 |

## 12. Still blocked by this plan

- **Any hosted pilot.** Phase 1A external pilots wait on the hosting ADR (already stated in ADR-0002's consequences).
- **Automated backups, production TLS and real email deliverability** — see §8 and R3–R5.

---

## 13. SRS reconciliation record

This plan was drafted before `product/SRS.md` was available in the working tree, then reconciled against the merged SRS §3. The reconciliation changed six things, listed here so a reviewer can check the delta rather than re-read the whole document.

| # | SRS requirement | What changed |
|---|---|---|
| 1 | NFR-SEC-12 ("0 secrets in source") | The SeaweedFS S3 identity file is no longer committed. It is **generated by `dev:up` from env vars**, with only a `${VAR}` template in git (§1.2). The earlier draft committed a throwaway key pair in `docker/seaweedfs/s3.json`, which would have been a credential in source |
| 2 | NFR-SEC-5 ("signed download URL lifetime ≤ 5 minutes") | `STORAGE_DOWNLOAD_URL_TTL_SECONDS` now carries a **hard schema cap of 300 seconds**. The 120 s default was already compliant; the cap stops a later ticket raising it (§2.5) |
| 3 | NFR-SEC-2, NFR-OBS-1 (no plaintext token at rest **or in logs**) | New required variable `LOG_REDACT_PATHS`, so redaction is a logger configuration rather than a per-call-site discipline (§2.10) |
| 4 | NFR-SEC-7 ("HTTPS everywhere outside the local Compose loopback") | Plain-HTTP **LAN** phone testing is not loopback, so it is now stated as an explicit, guarded exception rather than an unremarked default, and Q5 was rewritten to ask for it directly (§5.1, R5, Q5) |
| 5 | NFR-ENV-1 (names MinIO) | Q1 now asks to amend **the SRS as well as ADR-0002**. Two Accepted documents name a dependency that no longer exists (R11) |
| 6 | NFR-OBS-3, NFR-OBS-5, NFR-OBS-6, NFR-A11Y-4 | §7 now distinguishes coverage **measured** from day one versus **enforced** by Wave 2, adds the axe-core row, and names NFR-OBS-6 as the reason the Wave-2 job needs all three service containers simultaneously |

Nothing in the SRS contradicted the service set, the adapter interfaces, the backup design or the setup path. NFR-REL-1's local wording ("documented and exercised database + object-storage dump/restore") matches §4 and §4.6 as drafted.
