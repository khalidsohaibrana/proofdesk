# Interface states — review canvas and submission builder

**Status:** Draft — awaiting product owner selection (B8)

These are the two surfaces where a missing state becomes a product failure. Everything required by Product Knowledge §6.5 is covered. Each state names what the user sees, what is interactive, and what must **not** be shown.

Direction-neutral: these states apply whichever visual direction is selected. Token names referenced here exist in both directions (see `visual-direction.md`).

---

## A · Client review canvas (C4) + pin/thread (C5)

### A1 · Access and identity states

| State | Canvas | Write controls | Copy |
|---|---|---|---|
| `loading-token` | Full-bleed skeleton of the first item at its real aspect ratio (from snapshot metadata, so no layout shift) | absent | — |
| `link-invalid` | not rendered | absent | "This link isn't valid. Ask <Studio> to send a new one." Terminal. |
| `link-expired` | not rendered | absent | "This review link has expired." Terminal. |
| `link-revoked` | not rendered | absent | "Access to this review was turned off." Terminal. No project or file detail. |
| `unverified` | full canvas, read-only, zoom and paging allowed | **visible and gated**, not hidden | On each control: "Verify your email to comment". Primary bar: "Verify to comment or make a decision". |
| `otp-sent` | canvas behind a sheet | OTP input only | "We emailed a 6-digit code to j•••@example.com. It expires in 9:12." Email not editable. |
| `otp-invalid` | unchanged | OTP input, error state | "Incorrect code. 3 attempts left." |
| `otp-expired` | unchanged | resend only | "That code expired. Send a new one." |
| `otp-locked` | unchanged | cooldown timer | "Too many attempts. Try again in 10 minutes." |
| `verified-reviewer` | full | comment, reply, request changes | Role line: "You're reviewing as jane@example.com (Reviewer)." |
| `verified-approver` | full | comment, reply, request changes, approve | "You're reviewing as jane@example.com. You can approve this submission." |
| `revoked-mid-session` | frozen, then replaced | rejected | "Access to this review was turned off. Your unsent comment wasn't saved." Local drafts cleared with notice. |
| `history-readonly` (older round via C7) | full, read-only | absent | "Round 1 — changes requested 18 Nov. Kept as history; comments can't be added." |

### A2 · Work rendering states (per item)

| State | Behaviour |
|---|---|
| `item-loading` (image) | Blurred/low-res placeholder at the exact aspect ratio from snapshot metadata, swapped on load. Never a centred spinner on empty space — the work's frame is always present. |
| `item-loading` (PDF page) | Page-sized mat with a thin determinate progress bar; adjacent pages prefetched one ahead and one behind. |
| `item-rendered` | The work occupies the majority of the viewport. Chrome is secondary (§6.1). |
| `item-render-failed` | In-frame: "This file couldn't be displayed." + **Retry** + **Download original**. The other items stay usable and the pager still works. |
| `item-render-failed-partial` (one PDF page) | That page only shows the failure; paging continues. |
| `item-too-large` (over the in-browser page cap, B6) | "This PDF has 84 pages. In-browser review covers the first 50. Download the original for the rest." Pages beyond the cap are listed but not pinnable. **See open question 2.** |
| `item-download-only` | Should not occur in a published submission (the builder blocks it). Defensive state: "Download only — this file isn't reviewable in ProofDesk." |
| `zooming` | Zoom level indicator; pins scale position, not size; `fit`/`100%`/`+`/`−` controls. |
| `panned-away` | Edge affordance: "2 comments off screen →" tapping recentres the nearest pin. |
| `offline` | Banner "You're offline. We kept what you've typed." Already-rendered pages stay viewable; writes queue and are never silently dropped. |

### A3 · Feedback states

| State | Behaviour |
|---|---|
| `no-feedback` | Overall-comment entry reads: "No comments yet. Tap a spot on the drawing to comment, or add a general note." Not an illustration. |
| `pin-mode-armed` | Crosshair cursor / "Tap the drawing where you want to comment" hint bar; Esc or Cancel exits; the arming button is the only way in (no long-press). |
| `pin-draft` | Pin is draggable until posted; category selector required before the Post button enables; Esc discards after confirm if text exists. |
| `category-required` | Post disabled with named reason: "Pick a type so the studio can sort it." Four options only: Question, Change Request, Preference, Concern. |
| `posting` | Pin shown in a pending treatment; composer disabled but text visible. |
| `post-failed` | Pin kept in pending treatment, inline error + Retry, **text preserved**. |
| `posted` | Pin becomes a numbered marker; thread opens; `--duration-normal` settle animation, suppressed under reduced motion. |
| `thread-open` | Author display name, role label, category chip, body, replies, timestamps in the viewer's timezone. |
| `thread-resolved` | Collapsed with "Resolved by <Studio> · 22 Nov", still expandable and readable. Resolution is studio-set; the client cannot resolve. |
| `replying` / `reply-failed` | As posting/post-failed. |
| `thread-list` (phone) | Bottom sheet listing all threads with their pin numbers, filterable by open/resolved; tapping scrolls the canvas to the pin. |
| `pins-dense` | Overlapping pins within ~24 px cluster into a numbered group; tapping expands the list. |

**Never on this surface:** Included / Potential scope change, round markers, allowances, draft submissions, any other round the guest wasn't invited to, other recipients' email addresses, freehand/arrow/shape/measure tools, "private note" affordances.

### A4 · Decision states (C6)

| State | Behaviour |
|---|---|
| `decision-unavailable-unverified` | Entry visible, gated: "Verify your email to make a decision." |
| `decision-reviewer-only` | Approve is shown and **explained**, not hidden: "Only Jane Doe can approve this submission. You can comment and request changes." Request changes remains available. |
| `decision-ready-approve` | Sheet lists stage, then the exact file list with version numbers as snapshotted, the approver's verified email and display name, an optional note, and the scope statement: "You're approving this submission and the 4 files listed above, exactly as shown. It doesn't approve later versions, and it isn't a contract or a signature." |
| `decision-ready-request-changes` | Reason field, plus a live precondition line: "You've posted 3 comments" or "Add a reason to continue". Submit is impossible with neither. |
| `decision-submitting` | Button in a busy state; sheet not dismissible; no double submit. |
| `decision-success` | Persistent in-page receipt (not a toast): decision, submission title and round, file count, approver email, timestamp with timezone offset, "A copy has been emailed to you." |
| `decision-failed` | "Your decision wasn't recorded." + Retry. Unambiguous — never leave a spinner or imply success. |
| `decision-already-recorded` | Shows the existing record and who made it; no second write path. |
| `decision-recorded-approved` (return visit) | Canvas read-only for decisions, banner: "Approved 24 Nov by jane@example.com." Comments remain readable; **see open question 5** on whether commenting continues after approval. |
| `decision-recorded-changes-requested` | Banner: "You requested changes on 18 Nov. <Studio> has been notified." |
| `due-date-passed` | Non-punitive banner: "The requested date (18 Nov) has passed. You can still review and respond." Review does not close automatically in Phase 1. |

---

## B · Submission builder (P10)

Four sections in a fixed order with a persistent summary rail: **Files → Context → Recipients → Settings**. Not a blocking wizard — all sections are reachable at any time; publish readiness is evaluated continuously.

### B1 · Draft lifecycle states

| State | Behaviour |
|---|---|
| `draft-new` | Stage pre-filled from the project; title empty and focused; Files section open; summary rail shows every unmet precondition from the start, not after a failed submit. |
| `draft-autosaving` | Quiet "Saving…" → "Saved 14:02" in the rail. No blocking overlay. |
| `draft-save-failed` | Persistent rail warning "Changes not saved — Retry". Publish blocked while unsaved. Navigation guard. |
| `draft-restored` | "Picked up where you left off — last saved 14:02 yesterday." |
| `draft-loading` | Section skeletons at final heights. |
| `publishing` | Confirm dialog → busy state; sections locked; cancel unavailable once the request is in flight. |
| `published` | Builder becomes a read-only snapshot view. **No edit affordance exists** — not disabled, absent. One offered path: "Duplicate into a new submission". |
| `publish-failed` | Still `draft`, nothing sent, draft intact, named error + Retry. |
| `published-email-failed` | Published stands. Per-recipient delivery warning + "Resend invitation". Copy makes clear the submission is live: a notification failure never undoes publication. |
| `permission-denied` | Studio pattern: no confirmation that the record exists. |

### B2 · Files section states

| State | Behaviour |
|---|---|
| `no-assets-in-project` | Inline upload drop target inside the builder: "No files in this project yet. Upload the drawings you want reviewed." Accepted formats and limits stated. |
| `assets-available-none-selected` | Library list; each asset row expands to its exact versions (v1, v2 …) with version number, uploader, date. Publish precondition shown: "Select at least one file." |
| `version-pinning` | The selected version is always named on the row chip: `Ground floor plan · v2`. There is no "latest" option and no automatic bump. |
| `selected-reorderable` | Drag handles with visible order numbers; keyboard reorder via the handle (`Space` to lift, arrows to move, `Space` to drop) with a live-region announcement. |
| `item-pending-scan` | Row shown, selectable **off**: "Checking file (virus scan)". Publish blocked with the reason named; clears automatically. |
| `item-infected` | Row flagged, unselectable: "This file was blocked by a virus scan." |
| `item-download-only` | Unsupported preview format: unselectable for review, labelled "Download only — not reviewable". |
| `item-version-superseded` | Informational only: "v3 of this asset exists." Selecting v2 deliberately is valid and must stay possible. |
| `uploading-inline` | Per-file progress; the rest of the builder stays usable. |
| `upload-failed-inline` | Per-file reason + Retry on that file only. |

### B3 · Context section states

| State | Behaviour |
|---|---|
| `empty` | Four fields with real placeholder examples, not lorem: title, short context, "What we're asking you to decide", review instructions. |
| `stage-default` | Four defaults: Concept, Schematic Design, Design Development, Final Design. |
| `stage-custom` | A single free-text custom label. No stage builder, no stage management UI. |
| `validation` | Title required (publish precondition, named in the rail). Other fields optional but the rail flags a missing decision ask as a soft warning: "Clients respond better when the ask is explicit." |
| `char-guidance` | Soft guidance on the context length, never a hard block. |

### B4 · Recipients section states

| State | Behaviour |
|---|---|
| `no-contacts` | "This client has no contacts yet." + inline add-contact, returning to the builder without losing the draft. |
| `contacts-listed` | Checkbox to invite; a radio column for the one Primary Approver; the project's primary contact pre-suggested as approver but changeable. |
| `no-recipients` | Precondition: "Invite at least one person." |
| `no-approver` | Precondition: "Choose who can approve this submission." |
| `approver-reassigned` | Selecting a new approver clears the old one in the same interaction — exactly one, enforced by the control shape, not a validation message. |
| `approver-not-invited` | Impossible by construction: choosing an approver invites them. |
| `role-explainer` | One line, always visible: "Reviewers can comment and request changes. The approver can also approve." |

### B5 · Settings section states

| State | Behaviour |
|---|---|
| `due-date-empty` | Optional. Timezone shown explicitly next to the field. |
| `due-date-past` | Soft warning, not a block: "That date has already passed." |
| `round-marker` | Only when the stage has a configured allowance. Inside the **studio-only** region: "Studio only — never shown to the client." Options: counts as an included round / additional round. |
| `allowance-display` | "Schematic Design: 2 of 3 included rounds used." Display only — no fee logic, no enforcement, no client visibility. |
| `no-allowance-configured` | Section hidden entirely. No nagging to configure it. |

### B6 · Publish confirmation state

The dialog is the last point at which anything is editable, so it lists the snapshot explicitly rather than asking "Are you sure?":

```
Publish Round 2 to 2 people

Frozen on publish:
  4 files, at these versions   Ground floor plan v2, Elevations v2, Render A v1, Render B v1
  Order                        as shown
  Stage                        Schematic Design
  Title + context + the ask    "Revised layout — kitchen island"
  Recipients                   Jane Doe (can approve), Tom Doe (reviewer)
  Due date                     2 Dec 2026 (GMT+5)

After publishing, this submission can't be edited. Changes mean a new submission.

[ Cancel ]                                           [ Publish and notify ]
```

### B7 · Guest preview state (P11)

| State | Behaviour |
|---|---|
| `preview-frame` | Persistent, non-dismissible frame: "Preview — not published. The client can't see this yet." |
| `preview-as-reviewer` / `preview-as-approver` | Role switch; decision controls render but are inert and labelled "Disabled in preview". |
| `preview-incomplete-draft` | Renders anyway, with a list of what the client would not see yet. |
| `preview-375` | A phone-width frame is a first-class preview mode, because the client will most likely open it on a phone (§10.1 step 5). |
| `preview-data-source` | Rendered from the **guest read model only**. A studio-only field leaking into the guest payload becomes visible here first — this is deliberate and is a QA checkpoint. |
