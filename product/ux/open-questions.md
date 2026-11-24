# Open questions for the product owner — P0-5 UX

**Status:** Draft — awaiting product owner selection (B8)

Each item is a design question whose answer changes product behaviour, so it is `NEEDS HUMAN` rather than a designer's choice (Product Knowledge §11.5). Nothing below is an attempt to add scope; each is a gap where the product docs do not settle a behaviour the UI must express.

---

## Blocking — a UI ticket cannot start without an answer

### Q1 · Which visual direction? `NEEDS HUMAN` (B8)
- **A — "Drawing Set":** Swiss-rationalist paper and graphite, mono title-block metadata, one blueprint-blue accent, one light theme.
- **B — "Lit Gallery":** warm dark exhibition ground for client surfaces with an editorial serif and brass accent, plus a light studio scope.
- **Recommendation: A.** The hardest viewing task in the pilot is a line-drawing PDF, which is authored and judged on white; the product's proof surface is an approval record, which A expresses almost for free; and A has one theme, the most contrast headroom and the lowest risk of quiet degradation when agents implement it. Full reasoning in `visual-direction.md`.
- **Impact if unanswered:** structural work can proceed (tokens are name-compatible), but no visual-regression baseline can be taken and no UI ticket can be marked done.

### Q2 · What happens to a PDF with more pages than the in-browser cap? `NEEDS HUMAN`
Operating defaults B6 sets 50 pages per PDF for in-browser review, but the product docs do not say what the UI does with page 51.
- **(a)** Block the upload above 50 pages with a clear message.
- **(b)** Accept the upload, review the first 50 pages, and offer the original for download — pages beyond the cap are listed but not pinnable.
- **(c)** Accept and review all pages, treating 50 as soft guidance only.
- **Recommendation: (b).** An architect's full set routinely exceeds 50 pages and rejecting the upload would push them back to email, which defeats the Phase 1 outcome. (b) keeps the file retrievable and keeps every pin anchorable to a page that is genuinely rendered. It needs one piece of copy I have drafted in `interface-states.md` §A2 and one builder rule: pages above the cap cannot carry pins.
- **Why blocking:** it determines the asset-upload validation rules, the canvas pager and the pin-anchoring contract.

### Q3 · What does the client's submission history show for rounds they were not invited to? `NEEDS HUMAN`
§6.4 Client 6 says "restricted to the invited client's authorized visibility" without defining the restriction.
- **(a)** Absent entirely — the guest sees only their own rounds, numbered as the studio numbers them (so a guest invited to Rounds 1 and 3 sees "Round 1" and "Round 3", which implies a Round 2 exists).
- **(b)** Absent and renumbered, so the guest sees "Review 1" and "Review 2" with no gap.
- **(c)** Listed but locked, showing that a round exists without its content.
- **Recommendation: (a).** It matches the invariant (guest access is scoped to invited submissions) without inventing a parallel numbering scheme that would then disagree with every email and every studio screen. The leak it permits — that a round exists — is minor and usually something the studio would have said anyway. (c) is the wrong answer: it displays the existence of records the guest has no right to.
- **Why blocking:** it defines the guest history read model.

### Q4 · Can a client edit or delete their own comment? `NEEDS HUMAN`
§5.5 says existing messages remain; it does not say whether the author can correct a typo.
- **(a)** No edit, no delete. The client replies to correct themselves. Simplest and most audit-safe.
- **(b)** Edit within a short window (e.g. 5 minutes) before the studio has read it, with an "edited" marker.
- **(c)** Edit any time with full revision history retained.
- **Recommendation: (a) for Phase 1.** It preserves audit integrity, needs no new entity or state, and the reply path is already there. (b) looks friendly but introduces a read-receipt concept the product does not have, and (c) adds comment versioning on top of the version-aware model already being built.
- **Why blocking:** the thread component and the comment API contract depend on it.

---

## Non-blocking — needed before the relevant ticket, not before the first one

### Q5 · After a submission is approved, can comments still be added to it?
§5.5 says a thread stays `open ↔ resolved`; nothing says approval closes the conversation.
- **(a)** Yes, commenting continues (approval records a decision, it does not lock the round).
- **(b)** No, the round becomes read-only on approval.
- **Recommendation: (a).** An approval is evidence about a snapshot, not a conversation lock, and the snapshot is immutable regardless. (b) would also require a new "closed" state, which §5.5 warns against inventing.
- **Needed before:** the C4 post-decision state and the P12 approved banner.

### Q6 · Should the studio be prompted for a short description per file?
A drawing has no automatic text alternative, so a screen-reader user currently gets only the filename plus the submission's context.
- **(a)** No new field. Rely on filename + submission context + download original.
- **(b)** Add an optional one-line description per selected file in the submission builder, used as the accessible name and shown under the file in the canvas.
- **Recommendation: (b), as an optional field only.** It is one optional string on an existing entity rather than a new workflow, it measurably improves the accessible experience, and it doubles as a client-facing caption ("Option A — island at 1200mm"), which pilot studios are likely to want anyway. I have *not* designed it into the builder, because adding a field is a product decision, not mine.
- **Needed before:** the submission-builder ticket.

### Q7 · Who is the author identity on a studio reply?
Clients see comment authors. The product docs do not say whether a studio reply shows the individual member's name or the workspace display name.
- **(a)** Workspace display name only ("Studio Name") — a single studio voice, no member identities on guest surfaces.
- **(b)** Member display name ("Sam Okafor") with the workspace as context.
- **Recommendation: (a).** It keeps the guest field boundary narrow (no workspace member names or emails reach a guest surface), presents one professional voice to the client, and avoids a client addressing a junior directly. The studio still sees who wrote what internally.
- **Needed before:** the comment-thread ticket. I have assumed (a) throughout `screens.md` and the wireframes.

### Q8 · Does a passed due date change anything?
§6.5 lists "due date passed and review closed states **where implemented**".
- **(a)** Display and reminders only; nothing closes, nothing is blocked.
- **(b)** The submission visually marks itself overdue on the studio side and the guest banner is non-punitive.
- **(c)** Review closes automatically at the due date.
- **Recommendation: (b).** (c) is actively harmful — auto-closing the review would block a client who is ready to approve. I have designed (b).
- **Needed before:** the notifications/reminders ticket.

### Q9 · Does the review canvas need an "overall comment" distinct from a pin comment on the guest side?
§4.5 requires both, and I have designed both. The open part is placement on a 375 px screen: "Add a general note" currently lives at the bottom of the feedback sheet, which is a second tap away.
- **(a)** Keep it in the sheet (current design).
- **(b)** Give it a dedicated action-bar slot alongside "Comment", making the bar three primary items.
- **Recommendation: (a).** Anchored feedback is the differentiator and should stay the obvious default; a general note is the fallback. Worth revisiting with pilot evidence.
- **Needed before:** the review-canvas ticket. Non-blocking because it is a placement change, not a behaviour change.

---

## Things in §6.4 I could not fully design, and why

| §6.4 item | Gap | How I handled it |
|---|---|---|
| Client 6 · "Submission history … restricted to the invited client's authorized visibility" | The restriction is never defined | Designed assuming Q3 (a); flagged as blocking |
| Pro 8 · "Revision publishing and approval history" | The docs define the approval *record* precisely but not how rounds are presented over time (flat list vs threaded rounds vs stage grouping) | Designed as a flat round timeline grouped by design stage, since the allowance in §4.6 is per stage. Low risk, but it is my assumption |
| Pro 9 · "Minimal workspace member/settings screen" | "Minimal" is undefined, and the included-review-rounds allowance (§4.6) has no stated home | Placed the allowance here as optional per-stage defaults, because §4.6 calls it a studio-level definition. If the product owner wants it only per submission, P14 loses that section |
| §6.5 · "review closed states where implemented" | "Where implemented" leaves it to us, but closure is a product state | Did **not** design a closed state; raised as Q8 rather than inventing a lifecycle state (§5.5 warning) |
| §4.4 · "a separately recorded administrative correction that preserves the original snapshot" | Named as a possible route but with no defined behaviour, actor or UI | Did **not** design it. The designed route is the normal one the docs prefer: publish a new submission. If administrative correction is wanted as a real capability it needs its own product definition first |
| §4.3 · unsupported file types as "download-only attachments" | Whether a download-only attachment may be *included in a submission* is ambiguous | Designed it as **not selectable** in the builder, since §4.3 says such files "are not part of the review experience". If the product owner wants them attached to a submission as downloads, that is a small but real scope question |

---

## Nothing was added to `product/future-considerations.md`

Every idea that surfaced while designing was either in scope, or an open question above, or already listed in §9/§13 exclusions (compare overlays, comment migration, private threads, multi-approver, markup tools, white-labeling). I did not invent a new out-of-scope idea worth logging, so that file is unchanged.
