# ProofDesk — Software Requirements Specification (Phase 1)

**Status:** Draft — awaiting product owner acceptance
**Version:** 0.1
**Date:** 2026-11-24
**Author:** Product analyst agent (P0-1, `docs/plans/phase-0-foundation.md`)
**Scope:** Phase 1 (1A build + 1B hardening boundary), local-only environment per ADR-0002 amendment.

## 0. How to read this document

This SRS does **not** restate the product. It makes the approved scope addressable and testable. Every requirement cites its source section; if a behaviour is not cited, it is not a requirement — it is an open question (§8) or a future consideration.

**Sources (priority order per `docs/delivery/project-profile.md`):**

| Key | Document |
|---|---|
| PK | `product/ProofDesk_Product_Knowledge_Multi_Agent.md` (product source of truth) |
| SB | `product/ProofDesk_Phase_1_Scope_Baseline.md` |
| OD | `docs/delivery/operating-defaults.md` |
| PP | `docs/delivery/project-profile.md` |
| ADR-0002 | `docs/adr/0002-tech-stack-and-boilerplate.md` (Accepted with local-only amendment) |

**Requirement language:** MUST / SHOULD / MAY as defined in PK §0.2.

**Role shorthand** (the only roles in Phase 1 — PK §2.2, §2.3, §14.5–6):

| Code | Role |
|---|---|
| O | Workspace Owner |
| M | Workspace Member |
| R | Client Reviewer, email-verified |
| PA | Primary Approver for that submission, email-verified (exactly one per submission) |
| U | Invited guest holding a valid link, **not yet** email-verified |
| X | Anyone else: anonymous, forwarded-link holder, or a user of another workspace |

`X` is denied on every requirement in this document. Where a row lists denied roles, `X` is implied and omitted.

**Numbering:** functional `FR-<MODULE>-<n>`; non-functional `NFR-<AREA>-<n>`.

**Counts:** 94 functional requirements across 13 modules, 48 non-functional requirements across 9 areas, 12 open questions (5 blocking).

---

## 1. Modules

| Module | Code | PK source |
|---|---|---|
| Authentication | AUTH | PK §3.2, §6.4 (prof 1) |
| Workspace & tenancy | WS | PK §2.2, §4.1, §6.4 (prof 2, 9), §7.1 |
| Clients & contacts | CLI | PK §4.1, §5.1 |
| Projects | PRJ | PK §4.1, §6.4 (prof 2–3) |
| Brief | BRF | PK §4.2, §6.4 (prof 4, client 2) |
| Assets & versions | AST | PK §4.3, §6.4 (prof 5) |
| Submissions | SUB | PK §4.4, §6.4 (prof 6) |
| Guest access & verification | GST | PK §2.4, §7.2, §6.4 (client 1, 6) |
| Feedback | FBK | PK §4.5, §4.6, §6.4 (prof 7, client 3–4) |
| Revisions & rounds | REV | PK §4.6, §6.4 (prof 8) |
| Approval | APV | PK §4.7, §6.4 (prof 8, client 5) |
| History & activity | HST | PK §4.8, §8.2 |
| Notifications | NTF | PK §4.8, §8.1 |

---

## 2. Functional requirements

### 2.1 AUTH — Authentication

| ID | Requirement | Pri | Allowed | Denied | Source |
|---|---|---|---|---|---|
| FR-AUTH-1 | A professional can self-register an account with an email address and password. | MUST | public | — | PK §3.2 |
| FR-AUTH-2 | The system sends an email verification to a newly registered professional address and records the verified state. | MUST | public | — | PK §3.2; SB §3 |
| FR-AUTH-3 | A registered professional can sign in and obtain a server-side session that is the sole source of their identity and workspace context. | MUST | O, M | — | PK §3.2, §7.1 |
| FR-AUTH-4 | A professional can request a password reset by email and set a new password from the emailed link. | MUST | O, M | — | PK §3.2; SB §3 |
| FR-AUTH-5 | No project, asset, submission or brief data is reachable without either an authenticated professional session or a valid guest link; there is no public indexing or unauthenticated browsing. | MUST | O, M, R, PA, U (scoped) | X | SB §3 |

### 2.2 WS — Workspace & tenancy

| ID | Requirement | Pri | Allowed | Denied | Source |
|---|---|---|---|---|---|
| FR-WS-1 | A professional can create a personal or studio workspace; the creator becomes its Owner. | MUST | O, M | — | PK §4.1; SB §4 step 1 |
| FR-WS-2 | An Owner can invite a colleague by email to join the workspace as a Member. | MUST | O | M, R, PA, U | PK §2.2, §4.1 |
| FR-WS-3 | Workspace is the tenant boundary: every workspace-owned record is associated with a workspace directly or through a validated parent relationship. | MUST | — | — | PK §5.4.1 |
| FR-WS-4 | Every read, write, upload, download, comment, submission and approval operation performs a server-side authorization check that derives the workspace from the session, never from a client-supplied workspace or project identifier. | MUST | — | X | PK §5.4.2, §7.1 |
| FR-WS-5 | A minimal workspace screen lists members and their roles and lets the Owner manage members and workspace settings. | MUST | O (manage), M (view) | R, PA, U | PK §6.4 (prof 9) |
| FR-WS-6 | Phase 1 has exactly two professional roles, Owner and Member, with no granular per-project permission matrix. | MUST | — | — | PK §2.2, §14.5; SB §3 |

### 2.3 CLI — Clients & contacts

| ID | Requirement | Pri | Allowed | Denied | Source |
|---|---|---|---|---|---|
| FR-CLI-1 | A professional can create and edit a Client record within their workspace. | MUST | O, M | R, PA, U | PK §4.1, §5.1 |
| FR-CLI-2 | A professional can add one or more ClientContacts to a Client, each with a name and email. | MUST | O, M | R, PA, U | PK §4.1 |
| FR-CLI-3 | A professional can designate one primary client contact for a project; this is independent of the per-submission primary approver, which is chosen when that submission is prepared. | MUST | O, M | R, PA, U | PK §4.1 |

### 2.4 PRJ — Projects

| ID | Requirement | Pri | Allowed | Denied | Source |
|---|---|---|---|---|---|
| FR-PRJ-1 | A professional can create a project with a name, a client, an optional location, a project type and a current design stage. | MUST | O, M | R, PA, U | PK §4.1 |
| FR-PRJ-2 | The design stage is chosen from the defaults Concept, Schematic Design, Design Development, Final Design; a simple custom stage label may be entered. No configurable stage builder exists. | MUST | O, M | R, PA, U | PK §4.1 |
| FR-PRJ-3 | A workspace home screen lists the workspace's projects plus a compact needs-attention list. | MUST | O, M | R, PA, U | PK §6.3, §6.4 (prof 2) |
| FR-PRJ-4 | A project overview screen shows client, stage, brief status, submissions and recent activity. | MUST | O, M | R, PA, U | PK §6.4 (prof 3) |

### 2.5 BRF — Brief

| ID | Requirement | Pri | Allowed | Denied | Source |
|---|---|---|---|---|---|
| FR-BRF-1 | The brief is one fixed architecture-oriented form with exactly these fields: project goals/desired outcome; project type and areas/rooms; requirements and priorities; constraints; optional budget range; style preferences and things to avoid; reference links; reference images/PDFs; additional notes. It is not a form builder. | MUST | O, M, R, PA | U | PK §4.2 |
| FR-BRF-2 | A professional can prepare a brief and send it to a designated client contact through a recipient-scoped secure guest link. | MUST | O, M | R, PA, U | PK §4.2 step 1 |
| FR-BRF-3 | An invited guest can view the brief page before email verification but cannot submit or confirm it until verified. | MUST | U (read), R, PA (write) | X | PK §2.4, §5.4.11 |
| FR-BRF-4 | A verified invited client can complete or correct the requested brief information and submit it. | MUST | R, PA | U | PK §4.2 steps 2–3 |
| FR-BRF-5 | A professional can review the submitted brief, edit it and send the finalized brief to the designated client contact for confirmation. | MUST | O, M | R, PA, U | PK §4.2 step 4 |
| FR-BRF-6 | The designated client contact can confirm the finalized brief version; ProofDesk records the confirmed BriefVersion, the verified client identity and a timestamp. | MUST | the designated contact (R or PA) | other R, U | PK §4.2 steps 5–6 |
| FR-BRF-7 | A BriefVersion is immutable once submitted or confirmed; a later change creates a new BriefVersion and a new confirmation cycle, and never overwrites a confirmed version. | MUST | — | — | PK §4.2, §5.5 (Brief) |
| FR-BRF-8 | The brief exposes the lifecycle states draft → sent → client_submitted → awaiting_confirmation → confirmed (names may differ; behaviour must not). | MUST | O, M, R, PA | — | PK §5.5 (Brief) |
| FR-BRF-9 | Reference images and PDFs can be uploaded against a brief by the professional and by the verified invited client. | MUST | O, M, R, PA | U | PK §4.2 |
| FR-BRF-10 | No professional or client-facing wording presents brief confirmation as a contract, fee acceptance or legal signature. | MUST | — | — | PK §4.2, §7.5, §14.21 |

### 2.6 AST — Assets & versions

| ID | Requirement | Pri | Allowed | Denied | Source |
|---|---|---|---|---|---|
| FR-AST-1 | A professional can upload files to a project. Formats supported for in-browser review are PDF (multi-page), JPG/JPEG and PNG. | MUST | O, M | R, PA, U | PK §4.3, §14.8 |
| FR-AST-2 | Uploads are validated for type, size and content; the file extension alone is never trusted. | MUST | — | — | PK §7.4 |
| FR-AST-3 | An Asset is a logical object; an AssetVersion is one exact immutable uploaded file revision. Uploading a replacement creates a new AssetVersion and never overwrites or hides an earlier one. | MUST | O, M | R, PA, U | PK §4.3, §5.4.3, §6.3 |
| FR-AST-4 | Each AssetVersion records its version number, uploader and upload timestamp, and remains individually addressable. | MUST | O, M | R, PA, U | PK §4.3 |
| FR-AST-5 | An asset library screen shows assets with previews and per-asset version history. | MUST | O, M | R, PA, U | PK §6.4 (prof 5) |
| FR-AST-6 | A professional can preview a supported file in-browser and download the original file. | MUST | O, M | R, PA, U | PK §4.3 |
| FR-AST-7 | Original file download is available only to authorized workspace/project professionals and to invited recipients with access to a submission containing that AssetVersion. | MUST | O, M, R, PA (scoped) | U, X | PK §7.4; SB §7 |
| FR-AST-8 | File types other than PDF/JPG/JPEG/PNG, if accepted at all, are download-only attachments and are never presented in the UI as supported review formats. No native preview is built for CAD, DWG, RVT, IFC, BIM, 3D, PSD, AI, slide decks, video or audio. | MUST | — | — | PK §4.3, §9 |
| FR-AST-9 | Uploaded files are malware-scanned using the mechanism the selected infrastructure supports (locally, the ClamAV service); only files in a `clean` state are served for preview or download. | MUST | — | — | PK §7.4; ADR-0002 amendment |

### 2.7 SUB — Submissions

| ID | Requirement | Pri | Allowed | Denied | Source |
|---|---|---|---|---|---|
| FR-SUB-1 | A professional can create a draft Submission inside a project and assign its design stage. | MUST | O, M | R, PA, U | PK §4.4 |
| FR-SUB-2 | A professional can select one or more exact AssetVersions for a submission. Each SubmissionItem references an exact AssetVersion ID, never a mutable `latestVersion` pointer. | MUST | O, M | R, PA, U | PK §4.4, §5.4.4 |
| FR-SUB-3 | A professional can reorder the selected files; the order is part of the submission. | MUST | O, M | R, PA, U | PK §4.4 |
| FR-SUB-4 | A submission carries a title and a short context/description. | MUST | O, M | R, PA, U | PK §4.4 |
| FR-SUB-5 | A submission states what the client is being asked to review or decide, plus review instructions and an optional due date. | MUST | O, M | R, PA, U | PK §4.4 |
| FR-SUB-6 | A professional selects the invited reviewers and exactly one primary approver for the submission. The system rejects zero or more than one primary approver. | MUST | O, M | R, PA, U | PK §2.3, §4.4, §5.1 (SubmissionRecipient) |
| FR-SUB-7 | A professional can preview the guest review experience before publishing. | MUST | O, M | R, PA, U | PK §4.4, §6.4 (prof 6) |
| FR-SUB-8 | Publishing freezes an immutable snapshot of: selected AssetVersion identifiers and relevant file metadata, display order, title and context, design stage, review objective/instructions, invited recipients and their roles, and due date and review settings affecting the published review — and then notifies the invited recipients. | MUST | O, M | R, PA, U | PK §4.4, §5.4.5 |
| FR-SUB-9 | A published submission MUST NOT be silently edited. A correction is made either by publishing a new submission (the normal route) or by a separately recorded administrative correction that preserves the original snapshot and audit history. | MUST | — | — | PK §4.4, §7.3 |
| FR-SUB-10 | The submission exposes the states draft → published → (approved OR changes_requested); a subsequent review round is a new Submission. Closing or superseding a submission preserves its published state and decision history. | MUST | O, M | — | PK §5.5 (Submission), §6.5 |

### 2.8 GST — Guest access & verification

| ID | Requirement | Pri | Allowed | Denied | Source |
|---|---|---|---|---|---|
| FR-GST-1 | Guest access uses a cryptographically unguessable token scoped to one project/submission (or brief) and one invited recipient, with the recipient's permissions. | MUST | R, PA, U | X | PK §5.4.10, §7.2 |
| FR-GST-2 | A client participates without creating a ProofDesk account. | MUST | R, PA, U | — | PK §2.4, §14.7; SB §3 |
| FR-GST-3 | An invited guest may read the invited page before verification. The server enforces email verification before any comment, reply, change request, brief submission, brief confirmation or approval. | MUST | R, PA (write), U (read) | U (write) | PK §2.4, §5.4.11, §7.2 |
| FR-GST-4 | Verification is performed with a one-time code sent to the invited email address (or an equivalent secure email verification mechanism). | MUST | U | — | PK §2.4; SB §3 |
| FR-GST-5 | Client identity is the verified invited email address, not the display name. | MUST | — | — | PK §2.4 |
| FR-GST-6 | A forwarded link does not let a different email identity act as the invited recipient. | MUST | — | X | PK §2.4, §7.2 |
| FR-GST-7 | A workspace member can revoke a guest link. After revocation the server denies all subsequent reads and writes through that link; previously loaded or cached data is never treated as continuing authorization. | MUST | O, M (revoke) | R, PA, U (post-revocation) | PK §7.2; SB §3 |
| FR-GST-8 | Where link expiry is implemented, an expired link is denied with an expired-link state distinct from invalid and revoked. | SHOULD | — | — | PK §7.2, §6.5 |
| FR-GST-9 | Guest-facing endpoints and UI never return studio-only fields, including the Included / Potential scope change classification. | MUST | — | R, PA, U | PK §4.5, §5.4.12, §7.5 |
| FR-GST-10 | An invited client can see the submission history for that project limited to the submissions and content they were invited to and authorized to see. | MUST | R, PA | U | PK §6.4 (client 6); SB §5 |

### 2.9 FBK — Feedback

| ID | Requirement | Pri | Allowed | Denied | Source |
|---|---|---|---|---|---|
| FR-FBK-1 | A verified invited client can view the submission's images and multi-page PDFs on the review canvas, zoom images and navigate PDF pages. | MUST | R, PA | U | PK §4.5, §6.1 |
| FR-FBK-2 | A verified invited client can add a pin comment at a precise location on an image; image pin coordinates are normalized to the image dimensions (0–1). | MUST | R, PA | U | PK §4.5 |
| FR-FBK-3 | A verified invited client can add a pin comment on a PDF page; the comment stores the page index and normalized page coordinates, and the pin stays attached to the intended location under viewer scaling and page rotation/cropping. | MUST | R, PA | U | PK §4.5; ADR-0002 (Pins) |
| FR-FBK-4 | A verified invited client can add an overall submission comment that is not anchored to a file location. | MUST | R, PA | U | PK §4.5 |
| FR-FBK-5 | A verified invited client can reply to an existing comment thread; replies append and existing messages remain. | MUST | R, PA | U | PK §4.5, §5.5 (Feedback thread) |
| FR-FBK-6 | Feedback is categorized as exactly one of Question, Change Request, Preference or Concern. No other categories exist. | MUST | R, PA, O, M | U | PK §4.5, §14.13 |
| FR-FBK-7 | Every anchored FeedbackThread is bound to the exact AssetVersion contained in the published submission, plus optional PDF page and coordinates. | MUST | — | — | PK §4.5, §5.4.6 |
| FR-FBK-8 | Comments on an older AssetVersion remain on that version and location. They are never automatically repositioned, migrated or copied onto a newer version. | MUST | — | — | PK §4.5, §5.4.7, §9 |
| FR-FBK-9 | All comments and replies on a client-facing submission are visible to the invited client reviewers and to the studio. Phase 1 has no private internal threads or private notes on client submissions. | MUST | O, M, R, PA | U | PK §4.5, §14.14 |
| FR-FBK-10 | Annotation is pin-and-thread only. No freehand drawing, arrows, rectangles, measurement tools, text markup, compare overlays, real-time cursors or collaborative drawing is implemented. | MUST | — | — | PK §4.5, §9 |
| FR-FBK-11 | A review inbox shows all feedback for a submission in one place and lets the professional navigate from each comment to its anchored location. | MUST | O, M | R, PA, U | PK §4.6, §6.4 (prof 7) |
| FR-FBK-12 | A professional can reply to a client thread and mark a thread open or resolved; resolution changes status without altering existing messages. | MUST | O, M | R, PA, U | PK §4.6, §5.5 |
| FR-FBK-13 | A professional can apply the studio-only classification Included or Potential scope change to a Change Request thread. A comment or decision cannot be created or modified by anyone other than its own author identity. | MUST | O, M (classify) | R, PA, U | PK §4.6, §5.4.12; SB §7 |

### 2.10 REV — Revisions & round tracking

| ID | Requirement | Pri | Allowed | Denied | Source |
|---|---|---|---|---|---|
| FR-REV-1 | A professional can upload a new immutable AssetVersion in response to feedback without hiding or replacing prior versions (see FR-AST-3). | MUST | O, M | R, PA, U | PK §4.6, §6.3 |
| FR-REV-2 | A professional can create and publish a follow-up Submission containing the exact AssetVersions intended for the next review round. | MUST | O, M | R, PA, U | PK §4.6 |
| FR-REV-3 | The earlier submission and its comments, replies, change requests and decisions remain available and unchanged as history after a follow-up submission is published. | MUST | O, M, R, PA (scoped) | — | PK §4.6, §7.3 |
| FR-REV-4 | A studio may optionally define a number of included review rounds for a design stage. | MAY | O, M | R, PA, U | PK §4.6 |
| FR-REV-5 | At publication the studio can indicate whether a follow-up submission counts as an included round or an additional round. | SHOULD | O, M | R, PA, U | PK §4.6 |
| FR-REV-6 | ProofDesk displays the configured allowance and the recorded round history, and performs no automatic fee calculation, contractual enforcement, invoicing or payment. The system never automatically decides that a client request is out of scope. | MUST | O, M | R, PA, U | PK §4.6 |

### 2.11 APV — Approval & request changes

| ID | Requirement | Pri | Allowed | Denied | Source |
|---|---|---|---|---|---|
| FR-APV-1 | Only the designated Primary Approver of a published submission can approve it. The server denies approval to reviewers, unverified guests and professionals. | MUST | PA | R, U, O, M | PK §2.3, §4.7, §14.18 |
| FR-APV-2 | An approval records an ApprovalDecision containing: workspace and project identifiers, submission identifier and immutable snapshot reference/hash or equivalent stable reference, design stage, the exact AssetVersion identifiers in the snapshot, the approver's verified email and displayed name, decision type, optional decision note, and timestamp. | MUST | PA | — | PK §4.7; SB §4 step 7 |
| FR-APV-3 | A verified invited client can request changes on a published submission. | MUST | R, PA | U | PK §2.3, §4.5 |
| FR-APV-4 | A request-changes action requires a reason or at least one feedback comment, and returns the review outcome to the studio. | MUST | R, PA | U | PK §4.7 |
| FR-APV-5 | Neither an approval nor a request-changes action modifies the published submission snapshot. | MUST | — | — | PK §4.7, §5.4.5 |
| FR-APV-6 | A new Submission never inherits an earlier approval; an approval applies only to the submission it identifies. | MUST | — | — | PK §4.7, §5.4.9, §14.20 |
| FR-APV-7 | ApprovalDecision records are append-only: a past decision is never edited to represent a later review, and a later decision belongs to a later submission. | MUST | — | O, M, R, PA (edit/delete) | PK §5.5, §7.3 |
| FR-APV-8 | The approval UI states exactly what is being approved (submission, stage and the exact asset versions) and never describes the action as a legally binding e-signature or as approval of a construction contract. | MUST | — | — | PK §4.7, §7.5, §14.21 |

### 2.12 HST — History & activity

| ID | Requirement | Pri | Allowed | Denied | Source |
|---|---|---|---|---|---|
| FR-HST-1 | A project timeline records at minimum: brief sent, submitted, revised and confirmed; submission published and recipients notified; comments and replies; threads resolved or reopened; changes requested; new AssetVersions uploaded; new submissions published; approval decisions; guest link revocation; and submission closure where implemented. | MUST | O, M | R, PA, U | PK §4.8 |
| FR-HST-2 | ActivityEvents are generated by successful domain actions on the server, not by frontend assumptions, and are retrievable in project context. | MUST | — | — | PK §8.2 |
| FR-HST-3 | Audit history is not silently rewritten when a new version, submission or decision is created; approval and important activity history is append-only or otherwise tamper-evident. | MUST | — | O, M (rewrite) | PK §5.4.14, §7.3 |
| FR-HST-4 | A professional can retrieve, for any approval, exactly which submission and which AssetVersions were approved, by whom (verified email and name) and when. | MUST | O, M | R, PA, U | PK §10.1 step 8, §4.7 |
| FR-HST-5 | Domain state lives in authoritative database records; activity projections and notifications never substitute for authoritative state. | MUST | — | — | PK §5.4.13 |

### 2.13 NTF — Notifications

| ID | Requirement | Pri | Allowed | Denied | Source |
|---|---|---|---|---|---|
| FR-NTF-1 | The system attempts email notifications for exactly these triggers and recipients: brief invitation → invited client contact; brief submitted/ready for review → relevant project professional(s); confirmation requested → designated client contact; new submission published → all invited reviewers and the primary approver; new client comment/reply → relevant professional(s); professional reply → relevant client participant(s); changes requested → relevant professional(s); submission approved → project professional(s) and relevant client participants. | MUST | — | — | PK §8.1 |
| FR-NTF-2 | A review reminder is sent before and/or after a review due date, using basic reminder timing, to invited recipients who have not completed the relevant action. | MUST | — | — | PK §4.8, §8.1 |
| FR-NTF-3 | Recipient selection respects current project and submission authorization; people who no longer have access are not notified. | MUST | — | X | PK §8.1 |
| FR-NTF-4 | A notification delivery failure never undoes a comment, publication or approval that has been persisted. Delivery status and retry handling are separate from domain state. | MUST | — | — | PK §8.2, §5.4.13 |
| FR-NTF-5 | No notification center, digest, push notification or complex notification rule engine is built. | MUST | — | — | PK §4.8, §9 |

---

## 3. Non-functional requirements

`OPEN` means no product-doc limit exists and the product owner must set one. `ASSUMPTION` means the target comes from a repository standard, not from the product docs, and is offered for acceptance.

### 3.1 Security & authorization

| ID | Requirement | Target | Source |
|---|---|---|---|
| NFR-SEC-1 | Tenant isolation is enforced server-side in the data layer from the session-derived workspace, with a database-level backstop. | A cross-workspace read/write/download attempt by identifier guessing returns a denial in 100% of automated denied-path tests. | PK §7.1; ADR-0002 |
| NFR-SEC-2 | Guest link tokens are generated from a cryptographically secure source and stored hashed. | ≥ 256 bits of entropy; no plaintext token at rest or in logs. | PK §7.2; ADR-0002 |
| NFR-SEC-3 | Guest OTP verification is rate-limited and attempt-limited. | 6-digit code, 10-minute validity, max 5 attempts, per-identity rate limit. | ADR-0002 (Guest auth) |
| NFR-SEC-4 | Guest session credentials are HttpOnly cookies scoped to the invited recipient and submission. | No guest credential readable from client-side JavaScript. | ADR-0002 |
| NFR-SEC-5 | Revocation takes effect for all subsequent requests. | Post-revocation denial on the next request; any signed download URL lifetime ≤ 5 minutes. | PK §7.2; ADR-0002 |
| NFR-SEC-6 | Rate limiting on all authentication, verification and submission-form endpoints. | Thresholds `OPEN`. | Repo security rules; PK §7.2 |
| NFR-SEC-7 | Transport encryption and encryption at rest through the selected infrastructure. | HTTPS everywhere outside the local Docker Compose loopback; at-rest encryption `OPEN` until the hosting ADR. | PK §7.4; ADR-0002 amendment |
| NFR-SEC-8 | Uploaded files are stored in private storage and never served from a public bucket or path. | 0 publicly readable object paths. | PK §7.4; ADR-0002 |
| NFR-SEC-9 | Malware scanning gate. | Only `clean`-state files are previewable or downloadable; `pending_scan` and `infected` are blocked. | PK §7.4; ADR-0002 |
| NFR-SEC-10 | Error messages do not leak tenant, file or identity information on a denied path. | Denial responses are indistinguishable between "not found" and "not authorized" for cross-tenant access. | PK §7.1; repo security rules |
| NFR-SEC-11 | Published submission snapshots, ApprovalDecisions and ActivityEvents are protected against UPDATE/DELETE at the database level. | Direct UPDATE/DELETE on these records is rejected. | PK §5.4.5, §5.4.14, §7.3; ADR-0002 |
| NFR-SEC-12 | Secrets are supplied only through environment variables; `.env*` is never committed. | Only `.env.example` in the repository; 0 secrets in source. | OD #4; CLAUDE.md |

### 3.2 Privacy & wording

| ID | Requirement | Target | Source |
|---|---|---|---|
| NFR-PRIV-1 | Studio-only fields are absent from guest API response payloads, not merely hidden in guest UI. | Automated schema assertion on every guest endpoint response. | PK §5.4.12, §7.5 |
| NFR-PRIV-2 | No UI, email or document wording suggests that brief confirmation or approval is a legally binding contract or e-signature. | Reviewed wording list; 0 occurrences of e-signature/contract framing on these actions. | PK §7.5, §14.21; PP escalation triggers |
| NFR-PRIV-3 | Timestamps and due dates are displayed timezone-aware. | Stored in UTC; rendered in the viewer's timezone with the zone shown. | PK §7.5; SB §7 |
| NFR-PRIV-4 | Personal data collected is limited to what the workflow needs (professional account, client contact name/email, verified guest identity). | No additional personal data fields beyond §2 requirements. | PK §9; SB §6 |

### 3.3 Performance

| ID | Requirement | Target | Source |
|---|---|---|---|
| NFR-PERF-1 | Core Web Vitals on the client review canvas and professional home. | LCP < 2.5 s, INP < 200 ms, CLS < 0.1 — `ASSUMPTION` (repo web performance rules). | Repo rules; PK §6.1 |
| NFR-PERF-2 | A large architecture PDF (A1/A0) renders its first page on a real mid-range phone within an acceptable time. | Target `OPEN`. A week-1 spike measures the baseline before viewer feature work. | ADR-0002 (Consequences) |
| NFR-PERF-3 | PDF viewing is virtualized with a canvas size cap so page count does not degrade the session. | Up to the 50-page in-browser review limit (NFR-LIM-2) without a crash or unbounded memory growth. | ADR-0002; OD B6 |
| NFR-PERF-4 | File bytes do not pass through the web request/response path for heavy operations. | Direct-to-storage upload and short-lived signed download. | ADR-0002 |
| NFR-PERF-5 | List endpoints are paginated and bounded. | No unbounded project, submission, asset, thread or activity query. | Repo rules |

### 3.4 Accessibility

| ID | Requirement | Target | Source |
|---|---|---|---|
| NFR-A11Y-1 | Keyboard navigation for all interactive controls on required screens, including placing and opening a comment pin. | Every action in §2 reachable and operable by keyboard. | SB §7 |
| NFR-A11Y-2 | Visible focus indicators and labelled controls. | 0 unlabelled interactive controls; focus visible on all of them. | SB §7 |
| NFR-A11Y-3 | Readable contrast. | ≥ 4.5:1 for body text and ≥ 3:1 for large text and UI boundaries — `ASSUMPTION` (WCAG 2.2 AA level). | SB §7 |
| NFR-A11Y-4 | Automated accessibility checks in CI on required screens. | axe-core: 0 serious or critical violations. | ADR-0002 (Testing); OD A12 |
| NFR-A11Y-5 | Reduced-motion preference respected. | `ASSUMPTION` (repo web rules); no product-doc source. | Repo rules |

### 3.5 Mobile & responsiveness

| ID | Requirement | Target | Source |
|---|---|---|---|
| NFR-MOB-1 | Every client-facing screen is usable at 375 px width with touch interaction, without an account or a walkthrough. | Evidence at 375 px required for every client-facing ticket. | PK §4.5, §6.2; PP G3 |
| NFR-MOB-2 | The review canvas gives the design files the majority of available space on mobile. | Reviewed per UX direction (P0-5). | PK §6.1 |
| NFR-MOB-3 | The professional interface is responsive; mobile parity for professional administration screens is not required. | Breakpoints 375 / 768 / 1024 / 1440 verified for client-facing screens. | SB §7; repo web rules |
| NFR-MOB-4 | No native mobile app and no push notifications. | — | PK §9 |

### 3.6 Product limits

| ID | Requirement | Target | Source |
|---|---|---|---|
| NFR-LIM-1 | Maximum upload size per file. | 50 MB (soft limit). | OD B6 |
| NFR-LIM-2 | Maximum PDF page count for in-browser review. | 50 pages (soft limit); beyond this the file is handled as download-only with a clear state. | OD B6 |
| NFR-LIM-3 | Maximum storage per workspace. | 5 GB (soft limit). | OD B6 |
| NFR-LIM-4 | Exactly one primary approver per submission; multiple reviewers allowed. | Enforced server-side. | PK §2.3, §14.6 |
| NFR-LIM-5 | Final file-size, storage and retention limits are set from pilot evidence in Phase 1B. | Soft limits above are enforced with a clear user-facing message, not a silent failure. | PK §3.3, §12 |

### 3.7 Reliability, backup & retention

| ID | Requirement | Target | Source |
|---|---|---|---|
| NFR-REL-1 | Automated backups with a tested restore process before general availability. | Local Phase 1: documented and exercised database + object-storage dump/restore. Hosted targets (RPO/RTO) `OPEN` until the hosting ADR. | PK §7.4; SB §7; ADR-0002 amendment |
| NFR-REL-2 | Retention and deletion behaviour is defined before public launch; content required for an active approval record is never silently deleted. | Retention periods `OPEN` (decision B7 deferred). The no-silent-deletion rule applies now. | PK §7.4; OD (B7 deferred) |
| NFR-REL-3 | Background jobs (notifications, reminders, scanning) retry on failure without affecting domain state. | At-least-once delivery attempt with recorded status. | PK §8.2; ADR-0002 (pg-boss) |
| NFR-REL-4 | Availability target. | `OPEN` — not applicable while local-only. | — |

### 3.8 Observability & quality gates

| ID | Requirement | Target | Source |
|---|---|---|---|
| NFR-OBS-1 | Structured server logs for every authorization denial, guest verification attempt, revocation, publication and approval, without secrets or tokens. | Each of these actions is traceable in logs by workspace and actor identity. | PK §7.1–7.3; ADR-0002 (pino) |
| NFR-OBS-2 | Error tracking. | Local: console/pino. Hosted error tracker `OPEN` until hosting. | ADR-0002 amendment |
| NFR-OBS-3 | Test coverage on domain and server code. | ≥ 80% line coverage, enforced in CI. | OD A11 |
| NFR-OBS-4 | Every §5.4 invariant has a named test with an allowed path and a denied path. | 14/14 invariants covered (see §6). | PP G2/G3; OD A11; PK §11.4 |
| NFR-OBS-5 | Required CI checks. | Lint, typecheck and unit tests to start; E2E, a11y and coverage by Wave 2. | OD A12 |
| NFR-OBS-6 | An end-to-end automated test covers the full brief-to-approval workflow, including a mobile viewport run. | 1 passing E2E suite covering §5 steps 1–11. | PK §11.4 |

### 3.9 Environment constraints

| ID | Requirement | Target | Source |
|---|---|---|---|
| NFR-ENV-1 | Phase 1 runs locally on Docker Compose (Postgres, **SeaweedFS**, ClamAV, Mailpit). No cloud deploys and no paid services until a hosting ADR is accepted. *Amended 2026-11-24: MinIO replaced by SeaweedFS — MinIO's images were withdrawn and its repository archived. See ADR-0002, second amendment.* | 0 external paid dependencies. | ADR-0002 second amendment; OD B1 |
| NFR-ENV-2 | Storage, email and malware scanning are reached through adapter interfaces so that hosting changes are configuration-only. | One interface per concern, with a local implementation. | ADR-0002 amendment |
| NFR-ENV-3 | Real client data is never used in a local or tunnelled test session. | — | ADR-0002 amendment |

---

## 4. Acceptance criteria per module

Written for QA verification with evidence. Each module includes at least one denied-path and one failure-state criterion.

### AUTH
- **Given** a new visitor, **when** they register with a valid email and password, **then** an account exists in an unverified state and a verification email is captured by the local mail service. (FR-AUTH-1, FR-AUTH-2)
- **Given** a registered professional, **when** they request a password reset and follow the emailed link, **then** they can set a new password and the old password no longer signs them in. (FR-AUTH-4)
- **Given** an unauthenticated visitor, **when** they request a known project, asset or submission URL directly, **then** the server denies access and no project data appears in the response body. (FR-AUTH-5)

### WS
- **Given** an Owner, **when** they invite a colleague by email, **then** the colleague can accept and appears as Member in the workspace members screen. (FR-WS-2, FR-WS-5)
- **Given** a Member of workspace A, **when** they request a project, asset, submission, thread or file of workspace B by its identifier, **then** the server denies the request and returns no workspace B data. (FR-WS-3, FR-WS-4) — *denied path*
- **Given** a Member, **when** they attempt to invite or remove a workspace member, **then** the action is denied server-side. (FR-WS-2) — *denied path*

### CLI / PRJ
- **Given** a professional, **when** they create a client with two contacts and a project naming that client with a stage, **then** the project overview shows client, stage, empty brief status, no submissions and an empty activity list. (FR-CLI-1, FR-CLI-2, FR-PRJ-1, FR-PRJ-4) — includes *empty state*
- **Given** the stage selector, **when** opened, **then** it offers exactly Concept, Schematic Design, Design Development and Final Design plus a free-text custom label, and no stage-builder UI exists. (FR-PRJ-2)

### BRF
- **Given** a sent brief link, **when** the invited client opens it without verifying, **then** the brief is readable and every submit/confirm control is blocked by the server. (FR-BRF-3) — *denied path*
- **Given** a verified invited client, **when** they complete and submit the brief, **then** a BriefVersion is persisted and the brief state is `client_submitted`. (FR-BRF-4, FR-BRF-8)
- **Given** a confirmed BriefVersion, **when** the professional changes the brief and requests confirmation again, **then** a new BriefVersion is created, a new confirmation event is recorded and the previously confirmed version is still retrievable unchanged. (FR-BRF-7)
- **Given** any brief screen or email, **when** its wording is reviewed, **then** it contains no contract, fee-acceptance or e-signature framing. (FR-BRF-10)

### AST
- **Given** a professional, **when** they upload a multi-page PDF, a JPG and a PNG, **then** each previews in-browser and each original downloads byte-identical. (FR-AST-1, FR-AST-6)
- **Given** an existing asset at version 1, **when** a replacement file is uploaded, **then** version 2 is created, version 1 remains retrievable with its original uploader, timestamp and bytes, and the version history shows both. (FR-AST-3, FR-AST-4, FR-AST-5)
- **Given** a file renamed to `.pdf` whose content is not a PDF, **when** it is uploaded, **then** validation rejects it with a clear error and a retry path. (FR-AST-2) — *failure state*
- **Given** a file whose scan state is `pending_scan` or `infected`, **when** preview or download is requested, **then** the request is denied. (FR-AST-9) — *denied path*
- **Given** an invited client with access to submission S, **when** they request an AssetVersion not included in S, **then** download is denied. (FR-AST-7) — *denied path*
- **Given** an upload that exceeds 50 MB or a PDF above 50 pages, **when** attempted, **then** the user sees a clear limit message rather than a silent failure. (NFR-LIM-1, NFR-LIM-2) — *failure state*

### SUB
- **Given** a draft submission, **when** the professional selects asset versions, reorders them, sets title, context, objective, instructions, due date, reviewers and one primary approver, and publishes, **then** the snapshot records all of those values and the invited recipients are notified. (FR-SUB-1 … FR-SUB-8)
- **Given** a submission builder, **when** the professional selects zero or two primary approvers, **then** publication is rejected server-side. (FR-SUB-6) — *denied path*
- **Given** a published submission, **when** any actor attempts to change its item set, order, instructions, stage, recipients or due date, **then** the attempt is rejected and the stored snapshot is byte-for-byte unchanged. (FR-SUB-9) — *denied path*
- **Given** an asset that gains a newer version after publication, **when** the published submission is reopened, **then** it still displays the exact AssetVersions frozen at publication. (FR-SUB-2, FR-SUB-8)
- **Given** a draft submission, **when** viewed by a professional, **then** it is clearly distinguished from a published one and is not reachable through any guest link. (FR-SUB-10) — *state + denied path*

### GST
- **Given** a published submission, **when** recipient A's link is opened, **then** only submission A's content for recipient A's permissions is reachable, and altering the token or submission identifier is denied. (FR-GST-1) — *denied path*
- **Given** an unverified guest, **when** they attempt to comment, reply, request changes or approve, **then** the server denies each attempt with a verification-required state. (FR-GST-3) — *denied path*
- **Given** an invited guest, **when** they request a one-time code, **then** the code arrives at the invited address only, and an invalid or expired code produces a distinct error state with a retry path. (FR-GST-4) — *failure states*
- **Given** recipient A's link forwarded to person B, **when** B attempts to verify using their own email, **then** verification fails and B cannot act as A. (FR-GST-6) — *denied path*
- **Given** a revoked link, **when** the holder reloads the page, navigates within it or submits a previously loaded form, **then** every request is denied and a revoked-link state is shown. (FR-GST-7) — *denied path*
- **Given** any guest API response for a submission with a classified Change Request, **when** the payload is inspected, **then** no classification field is present at any nesting level. (FR-GST-9) — *denied path*

### FBK
- **Given** a verified client on a phone, **when** they place a pin on an image and on a specific PDF page and submit comments with categories, **then** each thread stores the exact AssetVersion, the page index where applicable, normalized coordinates and one of the four categories. (FR-FBK-2, FR-FBK-3, FR-FBK-6, FR-FBK-7)
- **Given** a pinned PDF comment, **when** the page is re-opened at a different zoom level, on a different viewport width and on a rotated/cropped page, **then** the pin renders at the same location on the page. (FR-FBK-3)
- **Given** threads on AssetVersion 1, **when** AssetVersion 2 is uploaded and published in a follow-up submission, **then** the version-1 threads remain on version 1 at their original coordinates and none appear on version 2. (FR-FBK-8) — *invariant*
- **Given** a submission with no feedback, **when** the review inbox is opened, **then** an empty state is shown. (FR-FBK-11) — *empty state*
- **Given** a thread, **when** the professional marks it resolved and then reopens it, **then** status changes are recorded and no message is altered or removed. (FR-FBK-12)
- **Given** a comment authored by client A, **when** client B or an unverified guest attempts to edit or delete it, **then** the attempt is denied. (FR-FBK-13) — *denied path*
- **Given** the review canvas, **when** its tools are inspected, **then** only pin-and-thread commenting exists — no drawing, shape, measurement or markup tool. (FR-FBK-10)

### REV
- **Given** feedback on submission 1, **when** the professional uploads a new AssetVersion and publishes a follow-up submission, **then** the follow-up contains the new versions, submission 1 remains published and intact with its comments and decisions, and the round history lists both. (FR-REV-1 … FR-REV-3)
- **Given** a stage with an included-rounds allowance configured, **when** a follow-up submission is published and marked included or additional, **then** the allowance and the recorded round history are displayed, and no fee, invoice or contractual conclusion is produced anywhere in the system. (FR-REV-4 … FR-REV-6)

### APV
- **Given** a published submission, **when** a Reviewer, an unverified guest or a professional attempts to approve, **then** each attempt is denied server-side. (FR-APV-1) — *denied path*
- **Given** the Primary Approver, **when** they approve, **then** an ApprovalDecision is stored with every field listed in FR-APV-2 and the submission snapshot is unchanged. (FR-APV-2, FR-APV-5)
- **Given** a request-changes attempt with no reason and no feedback comment, **when** submitted, **then** it is rejected with a clear message. (FR-APV-4) — *failure state*
- **Given** an approved submission, **when** a follow-up submission is published, **then** the follow-up has no approval and shows an awaiting-decision state. (FR-APV-6) — *invariant*
- **Given** a stored ApprovalDecision, **when** an update or delete is attempted at the API and at the database, **then** both are rejected. (FR-APV-7) — *denied path*
- **Given** the approval confirmation screen, **when** read, **then** it names the submission, stage and exact asset versions being approved and contains no e-signature or contract wording. (FR-APV-8)

### HST
- **Given** a completed project cycle, **when** the timeline is opened, **then** every event class in FR-HST-1 that occurred appears, in order, with actor and timestamp. (FR-HST-1, FR-HST-2)
- **Given** an approval, **when** the professional opens approval history, **then** they can identify the exact submission, the exact AssetVersion identifiers, the verified approver email and name, and the timestamp. (FR-HST-4)
- **Given** a persisted ActivityEvent, **when** an update or delete is attempted, **then** it is rejected. (FR-HST-3) — *denied path*

### NTF
- **Given** each trigger in FR-NTF-1, **when** the corresponding domain action succeeds, **then** exactly one email per authorized recipient is captured by the local mail service with correct addressing. (FR-NTF-1, FR-NTF-3)
- **Given** a recipient whose guest link was revoked, **when** a subsequent notification trigger fires, **then** that recipient receives no email. (FR-NTF-3) — *denied path*
- **Given** a mail service that is unavailable, **when** a comment, publication or approval is performed, **then** the domain record persists, the UI reports success for the domain action and the delivery is recorded as failed and retried. (FR-NTF-4) — *failure state*
- **Given** a submission with a due date, **when** the configured reminder time is reached and the recipient has not acted, **then** a reminder is attempted. (FR-NTF-2)

---

## 5. Traceability — PK §10.1 end-to-end acceptance scenario

| # | §10.1 step | Delivering FRs | Test type |
|---|---|---|---|
| 1 | Studio owner creates a workspace and project, adds a client, invites a colleague | FR-AUTH-1,2,3; FR-WS-1,2,5; FR-CLI-1,2,3; FR-PRJ-1,2,3,4 | E2E + integration (invite) |
| 2 | Studio sends a brief; client opens it without an account, verifies the invited email, completes and submits it | FR-BRF-1,2,3,4,9; FR-GST-1,2,3,4,5; FR-NTF-1 | E2E + integration (verification gate) |
| 3 | Studio reviews the brief and requests confirmation; client confirms the relevant brief version | FR-BRF-5,6,7,8,10; FR-NTF-1 | E2E + unit (version immutability) |
| 4 | Studio uploads a PDF and images, previews them, publishes a submission with stage, objective, recipients and due date | FR-AST-1,2,3,4,5,6,9; FR-SUB-1…8; FR-NTF-1 | E2E + integration (snapshot contents) |
| 5 | Client opens the submission on a phone, views the work, adds an anchored comment and a reply, then requests changes | FR-FBK-1,2,3,4,5,6,7,9; FR-APV-3,4; FR-GST-3; NFR-MOB-1 | E2E on mobile viewport + visual |
| 6 | Studio sees feedback in one place, responds, resolves threads, classifies a request, uploads a new AssetVersion, publishes a follow-up | FR-FBK-11,12,13; FR-GST-9; FR-REV-1,2,5; FR-AST-3; FR-SUB-8 | E2E + integration (classification never in guest payload) |
| 7 | Client reviews the new submission and the Primary Approver approves it | FR-APV-1,2,5,8; FR-SUB-8; FR-GST-3 | E2E + integration (role denial) |
| 8 | Studio retrieves exactly which submission and AssetVersions were approved, by whom and when | FR-HST-4; FR-APV-2; FR-SUB-2 | Integration |
| 9 | The first submission and its comments remain unchanged and accessible as history | FR-SUB-9,10; FR-FBK-8; FR-REV-3; FR-HST-3 | Integration + unit (immutability) |
| 10 | Revoking the guest link prevents further access; a different workspace cannot access the project or files | FR-GST-7; FR-WS-3,4; FR-AST-7; FR-AUTH-5 | Integration denied-path (both cases) |
| 11 | All required email notifications are attempted and the important domain actions appear in the project timeline | FR-NTF-1,2,3,4; FR-HST-1,2,5 | Integration + E2E against the local mail service |

**Coverage:** all 11 steps have covering FRs. No step is uncovered. Two steps depend on open questions that do not block the requirement itself: step 2 (OQ-3, brief link vs. submission link scoping) and step 6 (OQ-6, round-marking at publication).

---

## 6. Invariants (PK §5.4) → enforcing requirements

Each invariant needs **both** an allowed-path test and a denied-path test (PP G2/G3, NFR-OBS-4).

| # | Invariant | Enforced by | Denied-path test must prove |
|---|---|---|---|
| 1 | Workspace is the tenant boundary | FR-WS-3, FR-WS-4 | A record cannot be created or read without a validated workspace association |
| 2 | Every project operation verifies workspace membership and role | FR-WS-4, FR-WS-6, NFR-SEC-1 | A non-member and an other-workspace user are denied on every operation class |
| 3 | Asset is logical; AssetVersion is immutable history | FR-AST-3, FR-AST-4 | An AssetVersion cannot be updated, replaced or deleted |
| 4 | SubmissionItems reference exact AssetVersion IDs | FR-SUB-2 | A submission never resolves to a newer version after one is uploaded |
| 5 | Published Submission snapshot is immutable | FR-SUB-8, FR-SUB-9, NFR-SEC-11 | Every mutation route on a published submission is rejected |
| 6 | FeedbackThread location is bound to the exact AssetVersion and optional page/coordinates | FR-FBK-3, FR-FBK-7 | A thread cannot be rebound to another AssetVersion |
| 7 | Comments on older versions remain there; no automatic migration | FR-FBK-8 | No thread appears on a version it was not authored against |
| 8 | ApprovalDecision references one exact published Submission snapshot | FR-APV-2 | An approval cannot be stored without a resolvable snapshot reference |
| 9 | A new Submission has no inherited approval | FR-APV-6 | A newly published submission reports no approval |
| 10 | Guest tokens are scoped, unguessable, revocable and limited to the invited submission/project and recipient permissions | FR-GST-1, FR-GST-7, NFR-SEC-2, NFR-SEC-5 | Token alteration, cross-submission use and post-revocation use are all denied |
| 11 | Email verification required before guest mutation or approval | FR-GST-3, FR-APV-1 | Every guest write endpoint denies an unverified identity |
| 12 | Studio-only fields never returned to guest endpoints | FR-GST-9, FR-FBK-13, NFR-PRIV-1 | No guest response payload contains the classification field |
| 13 | Domain state lives in authoritative DB records; notifications and projections do not replace it | FR-HST-5, FR-NTF-4 | A notification failure leaves the domain record intact |
| 14 | Audit history is not silently rewritten | FR-HST-3, FR-APV-7, NFR-SEC-11 | UPDATE/DELETE on approval and activity records is rejected at API and DB level |

---

## 7. Edge cases and required states

Per PK §6.5. Every screen implementing a module must handle the applicable states.

| State class | Required behaviour | Source |
|---|---|---|
| Loading | Skeleton or progress for project, submission, asset list, PDF/image render | PK §6.5 |
| Upload progress | Per-file progress, cancel, and failure with retry | PK §6.5; SB §7 |
| Empty | No projects, no assets, no submissions, no feedback, no activity | PK §6.5 |
| Draft vs published | Visually and behaviourally distinct; drafts unreachable by guests | PK §6.5; FR-SUB-10 |
| Guest link invalid | Distinct state from expired and revoked; no project data disclosed | PK §6.5; FR-GST-8 |
| Guest link expired | Distinct state with a "request a new link" path (path itself `OPEN`, see OQ-4) | PK §6.5 |
| Guest link revoked | Access and writes denied immediately, including from a loaded page | FR-GST-7 |
| Verification required / sent / invalid code / expired code / verified | Five distinct states with attempt and rate-limit feedback | PK §6.5; NFR-SEC-3 |
| Unsupported preview format | Shown as download-only attachment, never as a review format | FR-AST-8 |
| Render failure (PDF/image) | Explicit error with retry and download fallback | PK §6.5 |
| Scan pending / infected | Preview and download blocked with an explanatory state | FR-AST-9 |
| Limit exceeded | Clear message for >50 MB file, >50 pages, workspace over 5 GB | NFR-LIM-1,2,3 |
| Open vs resolved feedback | Distinct in both studio inbox and guest canvas | FR-FBK-12 |
| Changes requested / approved confirmation | Explicit confirmation of what was decided and on which submission | FR-APV-4, FR-APV-8 |
| Permission denied / inaccessible project | Denial without disclosing the existence of other tenants' data | NFR-SEC-10 |
| Due date passed / review closed | Shown where implemented; does not silently block an invited action (see OQ-5) | PK §6.5 |
| Notification delivery failed | Visible to the professional without implying the domain action failed | FR-NTF-4 |

---

## 8. Open questions

**Blocking** (an FR or a Phase 0 ADR cannot be finalized without a decision).

**OQ-1 — Does request-changes belong to reviewers, or only to the Primary Approver?**
*Why it matters:* it changes the guest permission model and the APV endpoint authorization.
*Contradiction:* PK §2.3 and §4.5 give the Reviewer the ability to request changes; PK §4.7 frames both decisions as the Primary Approver's.
*Options:* (a) reviewers and the approver may both request changes; (b) only the approver may.
*Recommendation:* **(a)** — it matches two sections against one and preserves §10.1 step 5 where "the client" requests changes. Recorded as FR-APV-3. `NEEDS HUMAN`

**OQ-2 — Is a feedback category mandatory on every thread?**
*Why it matters:* decides form validation and whether the inbox can rely on category filters.
*Options:* (a) required on every client-authored thread; (b) optional with a default.
*Recommendation:* **(a) required on client-authored threads, optional on professional replies** — PK §1.4 treats a useful category as the differentiator. Currently written as FR-FBK-6 without stating mandatoriness. `NEEDS HUMAN`

**OQ-3 — Is the brief guest link the same credential type as the submission guest link?**
*Why it matters:* affects the GuestAccessLink model, scoping and revocation surface in ADR-0003.
*Options:* (a) one GuestAccessLink entity scoped to either a brief or a submission; (b) two separate mechanisms.
*Recommendation:* **(a)** — PK §5.1 defines one GuestAccessLink entity; a second mechanism would add an entity not in §5.2. `ASSUMPTION`

**OQ-4 — Is guest link expiry implemented in Phase 1, and with what lifetime?**
*Why it matters:* PK §7.2 says "where implemented", so it is optional; the review canvas needs an expired state and possibly a self-service re-request path, which is a new flow if we add one.
*Options:* (a) no expiry in Phase 1, revocation only; (b) expiry with a fixed lifetime and a "resend my link" action; (c) expiry with no self-service path (the studio resends).
*Recommendation:* **(c)** — keeps the expired state real without adding an unsourced guest flow. Lifetime suggestion: 90 days. `NEEDS HUMAN`

**OQ-5 — What happens after a review due date passes?**
*Why it matters:* PK §6.5 requires "due date passed and review closed" states but no section defines the effect on the invited actions.
*Options:* (a) informational only — the due date never blocks commenting or approving; (b) the studio can close a submission, which blocks further guest writes.
*Recommendation:* **(a) for Phase 1**, plus the display-only "closed" label where a submission is superseded. (b) introduces a state transition that is only ever referenced conditionally ("if implemented"). `NEEDS HUMAN`

**Non-blocking.**

**OQ-6 — Who sets, and where, the included-rounds allowance?** PK §4.6 says "a studio may define an optional number of included review rounds for a design stage" but no screen in §6.4 owns that setting. Options: workspace settings (global per stage) or per project. Recommendation: **per project**, on the project overview, since the allowance comes from a client agreement. `NEEDS HUMAN`

**OQ-7 — Must a professional verify their email before using the workspace?** PK §3.2 requires email verification but does not say it gates access. Options: (a) gate all workspace access; (b) gate only outbound actions (sending briefs, publishing); (c) no gate. Recommendation: **(b)** — it protects clients from unverified senders without blocking setup. `NEEDS HUMAN`

**OQ-8 — Is the "administrative correction" route to a published submission built in Phase 1?** PK §4.4 permits it but calls a new submission "the normal route". Options: (a) do not build it; (b) build it with an audit entry. Recommendation: **(a)** — FR-SUB-9 as written keeps the capability available for a later ticket without adding a state now. `ASSUMPTION`

**OQ-9 — What are the basic reminder timings?** PK §8.1 says "basic reminder rules"; SB §8 says "basic configurable reminder timing". Options: fixed (e.g. 1 day before, 1 day after) or studio-configurable per submission. Recommendation: **fixed defaults in Phase 1A**, configurability deferred — SB's "configurable" is the only mention and PK §9 excludes complex notification rules. `NEEDS HUMAN`

**OQ-10 — Does a Member have the same project access as the Owner?** PK §2.2 gives the Owner "access to workspace projects" and the Member work on "projects, briefs, assets, submissions and feedback", with no granular matrix. Options: (a) identical project access, Owner additionally manages members/settings; (b) something narrower. Recommendation: **(a)** — written into FR-WS-2, FR-WS-5, FR-WS-6. `ASSUMPTION`

**OQ-11 — Performance targets for the review canvas on a real phone.** NFR-PERF-2 is `OPEN`. The ADR-0002 week-1 PDF spike should produce a measured baseline, and the product owner should then accept a target. `NEEDS HUMAN` after the spike.

**OQ-12 — Retention and deletion (decision B7, deferred).** NFR-REL-2 is `OPEN`. Phase 1B needs a retention period, a deletion behaviour for a workspace or project, and an explicit rule that content under an active approval record is exempt. `NEEDS HUMAN` before public launch, not before Phase 1A build.

---

## 9. Explicitly not specified here

This SRS adds no requirement for anything in PK §9 or SB §8. Ideas raised while drafting that fall outside Phase 1 are recorded in `product/future-considerations.md`, not here. In particular, this document deliberately specifies no: billing or plan enforcement, client accounts, multiple or sequential approvers, private internal threads, markup beyond pins, comment migration, CAD/BIM/3D or video preview, third-party integrations, AI features, white-labeling, native apps, push notifications, or hosted infrastructure behaviour.
