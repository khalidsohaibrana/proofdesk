# Screen inventory — Phase 1

**Status:** Draft — awaiting product owner selection (B8)

Every screen required by Product Knowledge §6.4 / Scope Baseline §5. No screen here is optional, and no screen outside this list is in Phase 1.

Legend for roles: **O** Owner, **M** Member, **R** client Reviewer (guest), **A** client Primary Approver (guest; Reviewer capabilities plus approve), **—** unauthenticated.
"375" column: ✅ means the screen must be designed and evidenced at 375 px (G3 rule). Studio-side screens marked ◐ must remain *usable* at 375 px but are designed desktop-first.

---

## 0. The guest field boundary (hard UI rule)

This is a security boundary, not a styling preference. Invariant §5.4.12 and §7.5.

**A guest surface may render only these fields.** If a field is not on this list, it must not reach a guest page, a guest API response, a guest email, a page `<title>`, an open-graph tag, a client-side store, a React Server Component payload, or a browser devtools network body.

Allowed on guest surfaces:
- Workspace display name and (optional) logo; project name, project location, project type.
- Submission title, context/description, review objective, review instructions, design stage label, due date (timezone-aware), published-at timestamp.
- The submission's asset-version items: display filename, display order, page count, and the rendered file. Version number and "uploaded" date **only** as they appear in this submission's snapshot.
- Feedback threads and comments on *this* submission: author display name, author role label (`You`, `Reviewer`, or the studio's display name), category, body, created-at, open/resolved status.
- The guest's own invited email (masked until verified: `j•••@example.com`), their own role label, and their decision history on submissions they were invited to.
- Approval/changes-requested records for submissions this guest was invited to: decision type, approver display name, note, timestamp.

**Never on a guest surface (studio-only):**
- `Included` / `Potential scope change` classification on any thread — the single most dangerous leak in the product.
- Included-review-round allowance, round counts, and whether a submission was marked an included or additional round.
- Internal project notes, client record fields, other client contacts' email addresses, other projects.
- Draft submissions, unselected assets, asset versions not in this submission's snapshot, any other submission the guest was not invited to.
- Workspace member names/emails except the single studio display identity used as comment author, workspace settings, billing/plan data, guest tokens or OTP values for anyone.
- Activity timeline entries for actions the guest was not party to.

**UI consequence:** the guest app is a separate route group with its own layout and its own read models. Studio components are never reused on a guest route "with a prop to hide the field". Reviewer rendering of a thread and guest rendering of a thread are two components.

### Wording boundary (§7.5)

Approval copy must be plain and factual, never contractual. Approved vocabulary:

| Use | Never use |
|---|---|
| "Approve this submission" | "Sign", "Sign off", "e-sign", "Signature" |
| "You are approving the 4 files listed below, exactly as shown." | "Legally binding", "Agreement", "Contract", "Execute" |
| "Recorded on 24 Nov 2026, 14:02 (GMT+5) by jane@example.com." | "Certified", "Notarised", "Witnessed" |
| "This records your approval of this submission only. It does not approve later versions or any fee." | "Final approval of the project" |
| "Confirm brief details" (brief step) | "Accept terms", "Approve the quote" |

---

## 1. Professional screens

### P1 · Sign-up
- **Purpose:** create a professional account and the first workspace.
- **Roles:** —
- **Primary action:** Create account.
- **Data:** name, email, password; workspace name (personal or studio).
- **States:** idle · validating (inline, per field) · submitting · email-already-registered (offer sign-in, never reveal whether an email exists beyond the standard registration response) · weak-password · rate-limited · success → P3.

### P2 · Sign-in
- **Purpose:** authenticate a returning professional.
- **Roles:** —
- **Primary action:** Sign in.
- **Data:** email, password; link to P4.
- **States:** idle · submitting · invalid-credentials (generic message) · unverified-email (→ resend from P3) · rate-limited/locked · success → P6. Deep-link return: if the user arrived from a protected URL, return them to it after sign-in.

### P3 · Email verification (professional)
- **Purpose:** confirm the professional's email.
- **Roles:** O, M (unverified session).
- **Primary action:** Open the emailed link / Resend.
- **Data:** masked email, resend control with cooldown.
- **States:** awaiting-verification · resend-sent · resend-cooldown (`Resend available in 0:42`) · link-expired · link-invalid · already-verified · verified → P6.

### P4 · Password reset request · P5 · Password reset
- **Purpose:** recover access.
- **Roles:** —
- **Primary action:** Send reset link / Set new password.
- **States:** P4 idle · submitting · always-success confirmation (no account enumeration) · rate-limited. P5 valid-token · token-expired · token-used · submitting · success → P2.

### P6 · Workspace home
- **Purpose:** show what needs attention and get into a project in one click.
- **Roles:** O, M. **375:** ◐
- **Primary action:** Open the top needs-attention item.
- **Data:** needs-attention list (brief submitted awaiting studio review; brief awaiting client confirmation; submission published with unread client comments; changes requested; submission approved; review due date approaching or passed; upload failed/scan-failed asset) — each row naming project, client, what happened, when. Project list: name, client, stage, last activity, open-feedback count, latest submission status. Create project.
- **States:**
  - *empty (new workspace)* — a single first-run panel: "Create your first project", with the four-step path named (project → brief → submission → approval). Not a decorative illustration carousel.
  - *empty needs-attention, projects exist* — "Nothing waiting on you" plus the 3 most recent projects.
  - *loading* — skeleton rows matching final row height (CLS 0).
  - *error* — "Couldn't load your workspace" + Retry; projects and needs-attention fail independently.
  - *permission-denied* — not reachable; a member removed from a workspace lands on a workspace-chooser or "no workspace" state.
  - *stale* — background revalidate with a quiet "Updated just now" marker, no spinner over loaded content.

### P7 · Project overview
- **Purpose:** the project's single page of record: client, stage, brief status, submissions, activity.
- **Roles:** O, M (workspace-scoped). **375:** ◐
- **Primary action:** context-dependent — Start brief → Upload assets → New submission → Open review inbox. One primary button at a time, driven by the project's furthest-along state.
- **Data:** project name, client + contacts (with the primary contact flagged), location, project type, current design stage, brief status + confirmed version, asset count, submission list (round number, title, stage, status draft/published/approved/changes-requested, recipients, due date, decision), optional included-rounds allowance and round history (studio-only), recent activity feed, approval history entry points.
- **States:** loading (per-section skeletons) · empty-brief · empty-assets · empty-submissions ("Nothing published yet — build your first submission from the files you've uploaded") · error per section with independent retry · permission-denied (member of another workspace → full-page 404-style "This project isn't available to your workspace", never "exists but denied") · archived/closed submissions shown as history, never editable.

### P8 · Brief editor and confirmation status
- **Purpose:** compose the fixed brief, send it to the client, review what came back, request confirmation, and show which version is confirmed.
- **Roles:** O, M. **375:** ◐
- **Primary action:** Send to client → Review response → Send for confirmation.
- **Data:** the nine fixed fields (§4.2) with the client's submitted values alongside the studio's edits; reference links; reference images/PDFs; version selector; confirmation record (who confirmed, which version, when, timezone-aware); guest link status with revoke.
- **States:** draft · sent (awaiting client, with "Reminder sent"/"Resend invitation") · client_submitted (changed fields marked "Client edited") · awaiting_confirmation · confirmed (read-only, with "Create a new version" which explicitly says it starts a new confirmation cycle) · superseded version view (read-only banner: "Version 1 of 2 — confirmed 12 Nov") · loading · save-failed with retry and unsaved-change guard · link-revoked.
- **Note:** editing a confirmed brief never mutates it. The affordance is "New version", and the UI must say the previous confirmation stays on record.

### P9 · Asset library and version history
- **Purpose:** upload files, preview them, and see every immutable version.
- **Roles:** O, M. **375:** ◐
- **Primary action:** Upload files.
- **Data:** asset rows (thumbnail, name, type, latest version number, uploader, upload date, page count for PDFs, size, "used in N submissions"); per-asset version history (v1…vN, uploader, timestamp, download, "used in" submissions); download original.
- **States:**
  - *empty* — drop target as the primary surface, with accepted formats and limits stated: "PDF, JPG, PNG · up to 50 MB per file · up to 50 pages per PDF for in-browser review" (B6).
  - *uploading* — per-file progress with byte counts, cancel per file, aggregate progress; the page stays usable.
  - *processing / pending_scan* — "Checking file (virus scan)" with the file visible but not selectable for a submission.
  - *scan-infected* — file quarantined, not previewable, not selectable, delete offered, reason stated plainly.
  - *upload-failed* — per-file row with reason (too large, unsupported type, network) and Retry on that file only; other files keep going.
  - *unsupported-preview* — accepted as a download-only attachment and **labelled** "Download only — not reviewable in ProofDesk", and it must be unselectable in the submission builder (§3.4).
  - *preview-render-failure* — "This PDF couldn't be displayed. Download the original." with Retry.
  - *version-history empty* — v1 only, no history affordance beyond "Upload new version".
  - *replace flow* — "Upload new version" is explicit, and the confirmation states: v1 stays available, and comments on v1 stay on v1.
  - loading · error · permission-denied (as P7).

### P10 · Submission builder
- **Purpose:** assemble one review round from exact asset versions and publish it.
- **Roles:** O, M. **375:** ◐ (see `wireframes/submission-builder.md`)
- **Primary action:** Publish.
- **Data / fields:** title; context/description; what the client is being asked to review or decide; review instructions; design stage (4 defaults + custom label); selected asset versions with explicit version pinning and drag reorder; recipients from the project's client contacts with exactly one Primary Approver; optional due date (timezone-aware); optional included-round marker (studio-only).
- **States:** detailed in [interface-states.md](interface-states.md).
- **Scope guard:** the version picker shows exact versions, never "latest". There is no "always use newest file" option (§5.4.4).

### P11 · Guest preview
- **Purpose:** let the studio see exactly what the client will see, before publishing.
- **Roles:** O, M. **375:** ✅ (it previews a client surface, so it must be evidenced at 375)
- **Primary action:** Back to builder / Publish.
- **Data:** a true render of the guest review canvas against the draft's current selection, inside a persistent, obviously non-dismissible preview frame ("Preview — not published. The client cannot see this yet.").
- **States:** preview-as-Reviewer · preview-as-Primary-Approver (decision controls shown but inert, labelled "Disabled in preview") · incomplete-draft (preview still renders, with a list of what is missing) · render failure per item · exit.
- **Hard rule:** the preview renders from the **guest read model**, so if a studio-only field ever leaks it is visible here first. Never pass studio data into the preview by prop.

### P12 · Submission review inbox
- **Purpose:** one place to read all feedback on a submission, respond, resolve, and classify.
- **Roles:** O, M. **375:** ◐
- **Primary action:** Reply to the oldest open thread.
- **Data:** thread list (category Question / Change Request / Preference / Concern, open/resolved, author, excerpt, anchor target = file + page, last activity); the anchored canvas beside it with pins; reply composer; open/resolve toggle; **studio-only** Included / Potential scope change on Change Request threads; submission snapshot summary (stage, versions, recipients, due date, decision status).
- **States:** loading · empty ("No feedback yet — recipients were notified on 20 Nov. Send a reminder?") · all-resolved · filtered-to-empty (clear filters) · reply-sending / reply-failed-with-retry-keeping-the-draft-text · thread already resolved by a colleague (optimistic update reconciled with a quiet "Updated by Sam") · anchor unavailable because the pin's asset version failed to render (thread still readable, with "Couldn't load the file this comment points to") · changes-requested banner with the client's reason · approved banner (read-only, "Approved 24 Nov by jane@example.com — approval applies to this submission's 4 files") · permission-denied.
- **Classification control must be visually quarantined:** inside a labelled studio-only region ("Studio only — never shown to the client"), with a distinct surface and a lock glyph. This is a UI convention builders must copy verbatim wherever the field appears.

### P13 · Revision publishing and approval history
- **Purpose:** publish the next round, and retrieve exactly what was approved, by whom, when.
- **Roles:** O, M. **375:** ◐
- **Primary action:** Publish follow-up submission / Open an approval record.
- **Data:** round timeline (Round 1 → Round 2 …) with each submission's status and decision; per-round the exact asset versions included; included/additional round marker and allowance (studio-only); approval record detail — submission id, snapshot reference, design stage, every AssetVersion id and filename, approver's verified email and display name, decision type, optional note, timestamp with timezone; a copyable/printable record.
- **States:** loading · no-approvals-yet · changes-requested round · approved round · superseded round (read-only, "Round 1 — changes requested 18 Nov. Preserved as history.") · error · permission-denied.
- **Hard rule:** no edit, delete or re-date affordance anywhere on an approval record (§5.4.14, §7.3). Not even disabled — absent.

### P14 · Workspace members and settings (minimal)
- **Purpose:** invite a colleague, see members, set workspace display name/logo and timezone.
- **Roles:** O (manage), M (read, leave). **375:** ◐
- **Primary action:** Invite member.
- **Data:** member rows (name, email, role Owner/Member, status active/invited, joined date); invite by email; remove member (Owner only); workspace display name, logo, timezone; optional included-review-rounds default per design stage (§4.6, studio-only).
- **States:** loading · single-member (personal workspace) · invite-sent/pending with resend and revoke · invite-failed · last-owner-cannot-be-removed · member-view (controls absent, not disabled) · error.

---

## 2. Client (guest) screens

All client screens: **375 ✅**, designed phone-first, no account, no walkthrough. Every one of them carries the invited context (workspace name, project name, submission title) so the recipient knows what they opened.

### C1 · Guest link entry (pre-verification)
- **Purpose:** show the invited recipient what they have been sent and what they are being asked to do, before they verify.
- **Roles:** R, A (unverified token holder).
- **Primary action:** Verify to continue → C2. A secondary "Look around first" path into the read-only canvas is permitted by §2.4 and recommended.
- **Data:** workspace/project/submission context, design stage, what they are asked to review or decide, due date, their masked invited email, file count and thumbnails, a plain explanation that a code will be emailed.
- **States:** valid-unverified · already-verified-in-this-browser (skip to C4) · **link-invalid** · **link-expired** · **link-revoked** — three distinct, plainly worded dead ends, each with "Ask <workspace name> for a new link" and no retry loop. Loading. Offline.
- **Rule:** before verification the canvas is strictly read-only. Comment, reply, request-changes and approve controls are **present but clearly gated** ("Verify your email to comment"), because hiding them makes the next action unclear (§6.2) — but the server rejects them regardless (§7.2).

### C2 · Email verification (OTP)
- **Purpose:** prove the person holds the invited mailbox.
- **Roles:** R, A (unverified).
- **Primary action:** Enter the 6-digit code.
- **Data:** masked invited email, 6-digit input, resend with cooldown, expiry countdown ("Code expires in 9:12"), one-line reason: "We verify your email so your comments and decisions are recorded as you."
- **States:** idle · code-sent · submitting · **code-invalid** (attempts remaining shown: "Incorrect code. 3 attempts left") · **code-expired** (→ resend) · **attempts-exhausted** (locked, request a new code after a cooldown) · rate-limited · verified → C3 or C4 · link-revoked-mid-flow.
- **Forwarded-link rule (§2.4, §7.2):** the email address is **fixed and not editable**. There is no "use a different email" field. Copy: "The code goes to the address this link was sent to. If that isn't you, ask <workspace> to invite you directly." A forwarded link therefore cannot be used to act as the recipient.
- 375 detail: numeric keyboard (`inputmode="numeric"`, `autocomplete="one-time-code"`), paste of a 6-digit string fills all boxes, OS autofill supported.

### C3 · Brief completion / confirmation
- **Purpose:** let the client fill in or correct the brief, then confirm the finalized version.
- **Roles:** R (complete/submit), designated contact (confirm). Verified only.
- **Primary action:** Submit brief → later, Confirm these details.
- **Data:** the nine fixed brief fields with helper text in plain language, reference link fields, reference file upload, autosave indicator, progress ("4 of 9 sections"), and in confirmation mode a read-only rendering of the finalized version with a diff-style marker for what the studio changed.
- **States:** loading · not-yet-verified (read-only preview + verify prompt) · in-progress with autosaved draft (restored on return: "We kept your answers from 21 Nov") · validation (only truly required fields; budget is optional and labelled informational, not a quotation) · submitting · submitted (thank-you with what happens next and who to expect it from) · awaiting-confirmation · confirming · **confirmed** (read-only, timestamped, with the non-contractual line: "This records the design requirements you agreed. It isn't a contract, a fee agreement or a signature.") · superseded version (read-only) · upload-failed with per-file retry · save-failed with the answers preserved locally · link-expired/revoked mid-session.

### C4 · Submission review canvas
- **Purpose:** the highest-priority screen in the product. View the work large, understand what's being asked, and respond.
- **Roles:** R, A. Verified to write.
- **Primary action:** read the work; then comment, reply, request changes or approve.
- **Data:** the work (images and multi-page PDFs) occupying the majority of the viewport; submission title, stage, objective and instructions available but secondary; file strip/pager with order and position ("3 of 7"); zoom and PDF page navigation; pins; threads; overall-submission comment; decision entry point for the Primary Approver; due date.
- **States:** full matrix in [interface-states.md](interface-states.md). Wireframe in [wireframes/review-canvas.md](wireframes/review-canvas.md).

### C5 · Comment pin and thread/reply
- **Purpose:** anchor feedback to an exact place and hold the conversation about it.
- **Roles:** R, A (verified). Studio replies appear here too.
- **Primary action:** Place a pin → pick a category → write → Post.
- **Data:** pin position (normalized 0–1 against the image or PDF page box), target asset version + page index, category (Question / Change Request / Preference / Concern — exactly these four), body, author display name and role label, timestamps, replies, open/resolved status set by the studio.
- **States:** place-pin-armed (crosshair; Esc cancels) · pin-dropped-draft (movable until posted) · category-required · posting · post-failed (draft text preserved, Retry) · posted · thread-open · thread-resolved (collapsed, still readable, "Resolved by <studio>") · replying · reply-failed · read-only (unverified, or an older submission in history) · pin-off-screen indicator when zoomed/panned away ("2 comments off screen →").
- **Scope guards:** pin-and-thread only. No freehand, arrows, rectangles, measurement, text markup, cursors. No private threads — every comment on a submission is visible to the invited reviewers and the studio, and the composer must not imply privacy. No comment editing or deletion by the client in Phase 1 (§5.5: messages remain) — **see open question 4**.

### C6 · Approve / request changes confirmation
- **Purpose:** record one decision against one exact submission, with no ambiguity about what it covers.
- **Roles:** A only (approve + request changes); R (request changes only). Verified.
- **Primary action:** Approve this submission / Request changes.
- **Data for Approve:** the design stage; the exact file list being approved, with version numbers as snapshotted; the approver's verified email and display name; optional note; and the plain scope statement: "You're approving this submission and the 4 files listed above, exactly as shown. It doesn't approve later versions, and it isn't a contract or a signature."
- **Data for Request changes:** a reason field, **or** at least one feedback comment already posted — the control must state which requirement is met ("You've posted 3 comments" / "Add a reason to continue") and must not allow an empty request (§4.7).
- **States:** entry-disabled-with-reason (not verified; not the Primary Approver — "Only <name> can approve this submission. You can comment and request changes."; a decision already recorded) · review-list · submitting · **success** (receipt: what was decided, on which submission, by whom, at what time with timezone, "A copy has been emailed to you") · failed (decision not recorded, explicit, with Retry — never an ambiguous spinner) · already-decided-elsewhere (reconcile and show the existing record) · revoked-mid-flow.
- **Hard rule:** a Reviewer who is not the Primary Approver sees the approve path **explained, not hidden** (§6.2) and server-rejected (§5.4.18). A new submission shows no inherited approval anywhere (§5.4.9).

### C7 · Client submission history
- **Purpose:** let the invited client see the rounds they were part of, and what was decided.
- **Roles:** R, A — restricted to submissions this contact was invited to.
- **Primary action:** Open a round.
- **Data:** per round: title, stage, published date, their own and others' comment counts on that round, the decision recorded and when, and the files as snapshotted. Read-only for closed/superseded rounds.
- **States:** loading · single-round ("This is the first review round") · multi-round list · a round the guest was *not* invited to is **absent entirely** (not greyed, not counted, not numbered in a way that reveals it — see open question 3) · read-only older round with banner ("Round 1 — changes requested 18 Nov. Kept as history; comments can't be added.") · error · revoked.

### C8 · Link dead-end page (invalid / expired / revoked)
- **Purpose:** end the journey clearly rather than looping.
- **Roles:** —
- **Data:** which of the three happened in plain words, the workspace display name if it can be shown safely, and what to do next. No project or submission detail, no file names, no email addresses.
- **States:** invalid · expired · revoked · rate-limited. Each a terminal page with no retry affordance.

---

## 3. Shared system surfaces

| Surface | Purpose | States |
|---|---|---|
| Toast / inline feedback | confirm a mutation or report its failure | success · error-with-retry · info. Destructive or legally-significant outcomes (publish, decision, revoke) get an inline persistent confirmation, never a toast alone |
| Confirm dialog | publish, revoke link, remove member, upload new version | idle · confirming · failed. Each names the irreversible consequence in one sentence |
| Offline / connection lost | protect in-progress writes | banner + composer drafts kept locally; writes queued never silently dropped |
| Empty-state pattern | one sentence of what this is, one of what to do, one action | — |
| Permission-denied pattern | studio: "This project isn't available to your workspace." guest: C8. Never leak existence | — |
| Timezone display | all timestamps show the viewer's zone with an explicit offset on decision/approval records | — |

---

## 4. Requirement traceability

| Screen | Product Knowledge | Scope Baseline |
|---|---|---|
| P1–P5 | §3.2 Authentication, §6.4 Pro 1 | §3, §5 Pro 1 |
| P6 | §6.3, §6.4 Pro 2 | §5 Pro 2 |
| P7 | §4.1, §6.4 Pro 3 | §4 Step 1, §5 Pro 3 |
| P8 | §4.2, §6.4 Pro 4 | §4 Step 2, §5 Pro 4 |
| P9 | §4.3, §6.4 Pro 5 | §4 Step 3, §5 Pro 5 |
| P10, P11 | §4.4, §6.4 Pro 6 | §4 Step 4, §5 Pro 6 |
| P12 | §4.6, §6.4 Pro 7 | §4 Step 6, §5 Pro 7 |
| P13 | §4.6, §4.7, §4.8, §6.4 Pro 8 | §4 Steps 6–8, §5 Pro 8 |
| P14 | §2.2, §4.1, §6.4 Pro 9 | §3, §5 Pro 9 |
| C1, C2, C8 | §2.4, §7.2, §6.4 Client 1 | §3, §5 Client 1 |
| C3 | §4.2, §6.4 Client 2 | §4 Step 2, §5 Client 2 |
| C4 | §4.5, §6.1, §6.4 Client 3 | §4 Step 5, §5 Client 3 |
| C5 | §4.5, §6.4 Client 4 | §4 Step 5, §5 Client 4 |
| C6 | §4.7, §6.4 Client 5 | §4 Step 7, §5 Client 5 |
| C7 | §4.8, §6.4 Client 6 | §4 Step 8, §5 Client 6 |
