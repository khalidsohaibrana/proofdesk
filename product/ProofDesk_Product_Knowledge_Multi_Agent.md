---
title: "ProofDesk Product Knowledge — Multi-Agent Supervisor Reference"
product: "ProofDesk"
document_type: "Product source of truth"
version: "1.0"
status: "Approved Phase 1 scope baseline"
last_updated: "2026-11-20"
audience:
  - supervisor_agent
  - product_agent
  - ux_ui_agent
  - frontend_agent
  - backend_agent
  - data_architecture_agent
  - qa_agent
  - security_agent
---

# ProofDesk — Product Knowledge for the Multi-Agent System

> **Purpose of this document:** This is the authoritative product reference for the ProofDesk multi-agent development system. The supervisor agent must read and apply it before planning, delegating, reviewing, or approving product work. Specialist agents should use it as the baseline for their assigned tasks.

> **Product north star:** Enable an independent architect or small design studio to take a real client project from a confirmed brief through design presentation, structured feedback, revision, and approval of the exact work reviewed — without needing another tool to complete that workflow.

---

## 0. Instructions to the supervisor agent

### 0.1 Treat this document as product source of truth

This document defines the currently approved product direction and Phase 1 scope. It is not merely background information or optional inspiration.

The supervisor MUST:

1. Read this document before creating implementation plans or delegating work.
2. Keep all proposed features, user flows, data models, APIs, UI, and tests consistent with the Phase 1 scope.
3. Preserve end-to-end workflow integrity. A feature is not complete merely because its screen or isolated API exists.
4. Resolve conflicts in favour of this document unless the product owner explicitly changes the scope.
5. Distinguish approved requirements from recommendations, assumptions, and unresolved technical decisions.
6. Ask specialist agents to inspect the existing repository and follow its established conventions before proposing a stack or changing architecture.
7. Review cross-agent outputs for consistency, especially frontend/backend contracts, data ownership, authorization, versioning, and audit history.
8. Prevent accidental expansion into CRM, full project management, procurement, CAD/BIM, or generic collaboration features.
9. Require meaningful automated tests and end-to-end validation for security-sensitive and version-sensitive behaviour.
10. Report any requirement that cannot be implemented as written, explain the trade-off, and present the smallest safe alternative. Do not silently omit it.

### 0.2 Product requirement language

Interpret requirement keywords as follows:

- **MUST / MUST NOT:** Non-negotiable Phase 1 requirement or constraint.
- **SHOULD / SHOULD NOT:** Strong recommendation. Deviations require a reason and supervisor review.
- **MAY:** Optional implementation choice that must not compromise a MUST requirement.
- **OUT OF SCOPE:** Do not implement in Phase 1 unless the product owner explicitly authorizes a scope change.

### 0.3 Scope precedence

When deciding whether to build something, use this order:

1. Explicit product-owner instruction in the current task.
2. This document's approved Phase 1 requirements.
3. Existing repository architecture and established implementation conventions, where they do not conflict with product requirements.
4. Specialist-agent recommendations.
5. General assumptions or industry conventions.

A specialist agent MUST NOT turn a suggestion, competitor feature, or technical preference into a product requirement.

### 0.4 No implementation before the workflow is understood

Before a non-trivial implementation task, the supervisor should establish the complete affected flow:

**User action → frontend state/UI → API or server action → authentication and authorization → domain logic → database/storage → events and notifications → resulting UI state.**

For cross-cutting changes, the supervisor should first produce a concise implementation plan and identify affected modules, entities, endpoints, permissions, and tests. Do not ask agents to make isolated code changes before understanding the complete flow.

### 0.5 Recommended agent responsibilities

| Agent | Primary responsibility | Must not decide independently |
|---|---|---|
| Supervisor | Product interpretation, task breakdown, architecture coordination, integration and acceptance | Expand product scope or ignore security invariants |
| Product / requirements agent | Convert requirements into precise behaviours, acceptance criteria and edge cases | Add new features outside Phase 1 |
| UX/UI agent | Professional and guest experiences, interaction design, responsive behaviour and states | Introduce workflows or roles that are not in scope |
| Data / architecture agent | Domain entities, relationships, persistence, versioning and system boundaries | Weaken immutability, tenant isolation or auditability |
| Backend agent | APIs, domain rules, authorization, storage and notifications | Trust client-side permissions or expose internal fields |
| Frontend agent | Professional workspace, submission builder, client review experience and state handling | Bypass backend authorization or mutate published snapshots |
| QA agent | Unit, integration, permission, regression and end-to-end testing | Treat screen existence as proof of workflow completion |
| Security agent | Threat review, guest-link security, tenant isolation, file handling and privacy | Approve insecure shortcuts for convenience |

The supervisor may combine roles when the system has fewer agents, but all responsibilities still need coverage.

---

## 1. Product definition

### 1.1 What ProofDesk is

ProofDesk is an **architecture-first client design review, feedback, revision and approval platform** for independent architects and small architecture/interior-design studios.

It helps a professional practice:

- Capture and confirm the client's design brief.
- Present selected design work in a polished, client-friendly submission.
- Collect feedback anchored to the relevant image or PDF page.
- Organize client feedback into actionable discussions.
- Respond to feedback and issue revised versions.
- Track basic included versus additional review rounds.
- Record a client's decision against the exact published submission and asset versions.
- Retrieve the complete history of what was presented, said, changed and approved.

### 1.2 What ProofDesk is not

ProofDesk is NOT intended to be:

- A full CRM or sales pipeline.
- A general-purpose project/task management suite.
- A procurement, inventory, invoicing or accounting system.
- A CAD authoring or BIM coordination system.
- A replacement for architecture design software.
- A generic file-storage drive.
- A legally binding e-signature service.
- A general-purpose social messaging or chat platform.

Do not turn ProofDesk into these products during Phase 1.

### 1.3 Positioning

**Category:** Client-facing design review and decision platform.

**Initial market:** Independent architects and small residential architecture practices.

**Secondary market:** Small interior-design studios with a similar client presentation and approval process.

**Core promise:** Present the work, collect actionable feedback, manage review rounds, and preserve decisions against the exact work reviewed.

**Product tagline:** “Your work. Their feedback. One clear workflow.”

**Product philosophy:** The work is the interface. The design should dominate the review experience; navigation, administration and configuration should remain secondary.

### 1.4 Differentiation to pursue

ProofDesk should differentiate through the combination of:

1. **Stage-aware submissions:** Every review has a clear design stage and a stated purpose or decision the client is being asked to make.
2. **Structured feedback:** Feedback has a useful category and an anchored location, rather than becoming an unstructured chat stream.
3. **Professional control:** Client feedback is input for the professional to evaluate, not an automatic instruction to change the design.
4. **Revision awareness:** The studio can track review rounds and internally classify a request as included or a potential scope change.
5. **Version-specific decisions:** Approval always refers to a frozen submission and its exact asset versions.

Do not claim that any single one of these features is unique in the market. The intended differentiation is the integrated, simple architecture-focused workflow.

---

## 2. Target users and roles

### 2.1 Initial ideal customer profile

- Independent architects and small residential architecture practices.
- Initial team-size hypothesis: approximately 1–15 people. This is a targeting hypothesis, not a verified market statistic.
- Secondary: small interior-design studios.
- Buyer: studio owner, principal architect or design director.
- Daily user: architect, designer or project lead.
- External users: homeowner, client representative, spouse, family member or other invited decision-maker.

Do not optimize Phase 1 for large construction enterprises or multidisciplinary BIM coordination teams.

### 2.2 Professional workspace roles

**Owner**
- Creates and owns the workspace.
- Manages workspace settings and members.
- Has access to workspace projects and project data.

**Member**
- Works on projects, briefs, assets, submissions and feedback.
- Phase 1 does not include a granular permission matrix between professional members.

### 2.3 Client-side roles

**Reviewer**
- Can access the submissions for which they are invited.
- Can view work, create comments, reply to threads and request changes.
- Cannot approve unless designated as the primary approver.

**Primary approver**
- Is one designated client contact per submission.
- Has reviewer capabilities plus the ability to approve that submission.
- Phase 1 supports exactly one primary approver per submission.

Multiple reviewers are allowed. Do not build sequential approval, all-signers-required rules, or complex approval chains in Phase 1.

### 2.4 Client account and identity model

- Clients do not need to create a full ProofDesk account to participate.
- Guest access through a secure, recipient-specific link is the default.
- A client may view the invited page before verification, but MUST verify their invited email before commenting, replying, requesting changes, or approving.
- Verification uses a one-time code or equivalent secure email verification mechanism.
- A client identity is based on the verified invited email, not display name alone.
- A forwarded link must not grant another person the original recipient's ability to act as that recipient.
- Optional full client accounts and cross-workspace client dashboards are OUT OF SCOPE.

---

## 3. Phase 1 objective and release boundary

### 3.1 The single end-to-end outcome

A solo architect or small studio must be able to complete this real client workflow inside ProofDesk:

**Create project → capture and confirm brief → upload design files → publish submission → client reviews and comments → studio responds and revises → client approves exact submission → studio retrieves approval history.**

This is the definition of Phase 1 value.

### 3.2 Phase 1 modules

| Module | Required Phase 1 capability |
|---|---|
| Authentication | Professional sign-up/sign-in, email verification and password reset |
| Workspace | Personal or studio workspace, Owner and Member roles |
| Clients | Client records and contacts |
| Projects | Project creation, basic details and design stage |
| Brief | Fixed architecture-oriented brief, guest completion and confirmation |
| Assets | Image/PDF uploads, previews, downloads and immutable versions |
| Submissions | Build, preview, publish and preserve a review snapshot |
| Client review | Secure guest access and responsive review canvas |
| Feedback | Anchored pins, threads, replies, categories and resolution |
| Revisions | New asset versions, follow-up submissions and basic round tracking |
| Approval | Request changes or approve one exact submission |
| History | Project activity and retrievable submission/approval history |
| Notifications | Essential email notifications and reminders |

### 3.3 Phase 1 release stages

**Phase 1A — End-to-end pilot**
- Build all required workflow capabilities.
- Onboard pilot workspaces manually.
- Use founder-managed plans and manual billing.
- Validate with 3–5 real studios and actual client projects.

**Phase 1B — Public launch hardening**
- Add the selected subscription/payment provider and plan limits.
- Finalize file-size and storage quotas based on real usage and infrastructure cost.
- Improve onboarding and help content from observed friction.
- Add launch-market data export, retention and operational controls.

Phase 1B does not authorize expansion into generic project management.

---

## 4. Approved end-to-end workflows

### 4.1 Workspace, project and client setup

A professional can:
- Create a personal or studio workspace.
- Invite a colleague as a Member.
- Create a project with name, client, optional location, project type and current design stage.
- Add one or more client contacts.
- Identify a primary client contact for the project; the primary approver for a specific submission is selected when that submission is prepared.

Default design stages:
- Concept.
- Schematic Design.
- Design Development.
- Final Design.

A simple custom stage label may be entered where needed. A configurable stage builder is OUT OF SCOPE.

### 4.2 Brief creation and confirmation

Phase 1 includes one fixed architecture-oriented brief form. It is NOT a form builder.

Brief fields:
- Project goals and desired outcome.
- Project type and areas/rooms included.
- Requirements and priorities.
- Constraints, such as site, practical or design constraints.
- Budget range (optional and informational; not a quotation).
- Style preferences and things to avoid.
- Reference links.
- Reference images/PDFs.
- Additional notes.

Workflow:
1. Professional prepares and sends the brief through a secure guest link.
2. Client verifies the invited email and completes or corrects the requested information.
3. Client submits the brief.
4. Professional reviews it and sends the finalized brief for confirmation.
5. The designated client confirms the finalized brief.
6. ProofDesk records the confirmed brief version, verified client identity and timestamp.

A confirmed brief is versioned. Later changes create a new brief version and confirmation event. Brief confirmation records shared design requirements; it is NOT a contract, fee acceptance or legal signature.

### 4.3 Asset upload and versioning

Supported in-browser preview formats:
- PDF, including multiple pages.
- JPG/JPEG.
- PNG.

Required behaviour:
- Upload, preview and download original files.
- A logical Asset is separate from its immutable AssetVersions.
- Replacing an asset creates a new version. It never overwrites an old version.
- Each version records version number, uploader and upload timestamp.
- A professional can choose an exact asset version when preparing a submission.
- Old versions remain retrievable subject to workspace/project access and retention policy.

Other file types, if accepted, are download-only attachments and are not part of the review experience. Do not implement native preview for CAD, DWG, RVT, IFC, BIM, 3D, PSD, AI, slide decks, video or audio in Phase 1.

### 4.4 Build and publish a submission

**Submission is the central Phase 1 product object.** It represents one formal review round. Do not create separate Presentation and ReviewRequest concepts in the MVP unless a concrete repository constraint requires it and the supervisor approves the deviation.

The professional can:
- Create a submission within a project.
- Assign the design stage.
- Select one or more exact AssetVersions.
- Reorder the selected files.
- Add a submission title and short context/description.
- State what the client is being asked to review or decide.
- Add review instructions and an optional due date.
- Select invited reviewers and exactly one primary approver.
- Preview the guest experience before publishing.
- Publish and notify the invited recipients.

On publication, ProofDesk freezes a snapshot of:
- Selected asset-version identifiers and relevant file metadata.
- Display order.
- Submission title and context.
- Design stage.
- Review objective/instructions.
- Invited recipients and their roles.
- Due date and review settings that affect the published review.

A published submission MUST NOT be silently edited. Corrections require a new submission or a separately recorded administrative correction that preserves the original snapshot and audit history. The normal route is to publish a new submission.

### 4.5 Client review and feedback

The guest review page MUST be responsive and usable on a phone without an account or walkthrough.

A verified invited client can:
- View images and multi-page PDFs.
- Zoom images and navigate PDF pages.
- Add a pin comment at a precise location on an image or PDF page.
- Add an overall submission comment.
- Reply to an existing comment thread.
- Categorize feedback as one of: Question, Change Request, Preference, Concern.
- View comments and responses relevant to the invited submission.
- Request changes.
- Approve only when designated as the primary approver.

Phase 1 annotation is **pin-and-thread only**. No freehand drawing, arrows, rectangles, measurement tools, text markup, real-time cursors or collaborative drawing.

Annotation rules:
- Image pin coordinates are normalized to the image dimensions (0–1).
- PDF comments store the page index and normalized page coordinates; the implementation must account for viewer scaling and page rotation/cropping as required to keep the pin attached to the intended location.
- Every anchored thread is associated with the exact AssetVersion in the published Submission.
- Comments on an old version remain on that version. They MUST NOT be automatically repositioned or copied onto a newer version.

Visibility rules:
- All comments and replies in a client-facing submission are visible to invited client reviewers and the studio.
- Phase 1 has NO private internal comment threads or private notes attached to client submissions.
- Studio-only fields such as the internal scope classification must never be exposed in guest APIs or client UI.

### 4.6 Professional feedback management and revision

The professional can:
- View open feedback for a submission in one place.
- Navigate from each comment to its anchored location.
- Reply to the client.
- Mark a thread open or resolved.
- Apply a studio-only classification to a Change Request: **Included** or **Potential scope change**.
- Upload a new immutable AssetVersion.
- Create and publish a follow-up Submission containing the exact versions intended for the next review.

A follow-up submission is a new review round. The earlier submission, its comments, replies, requests and decisions remain available as history.

#### Basic revision allowance tracking

Phase 1 supports simple, optional tracking only:
- A studio may define an optional number of included review rounds for a design stage.
- At publication, the studio can indicate whether a follow-up submission counts as an included round or an additional round.
- ProofDesk displays the configured allowance and recorded round history.
- The studio remains responsible for interpreting its client agreement.
- No automatic fee calculation, contractual enforcement, invoicing or payment is included.

The system must not automatically decide that a client request is out of scope. The professional makes that assessment.

### 4.7 Approval and request changes

The one Primary Approver for a Submission can make one of two decisions:

**Approve this submission**
- Records acceptance of that exact published submission and the exact AssetVersions included in its snapshot.

**Request changes**
- Requires a reason or at least one feedback comment.
- Returns the review outcome to the studio for response and possible revision.
- Does not modify the published submission snapshot.

Approval record must include:
- Workspace and project identifiers.
- Submission identifier and immutable snapshot reference/hash or equivalent stable reference.
- Design stage.
- Exact AssetVersion identifiers included in the submission.
- Approver's verified email and displayed name.
- Decision type.
- Optional decision note.
- Timestamp.

A new submission MUST NOT inherit an earlier approval. Approval applies only to the identified submission. The UI must clearly explain what is being approved. Do not describe this action as a legally binding e-signature or as approval of a construction contract.

### 4.8 Activity history and email notifications

Provide a simple project timeline for:
- Brief sent, submitted, revised and confirmed.
- Submission published and recipients notified.
- Comments and replies.
- Threads resolved or reopened.
- Changes requested.
- New asset versions uploaded.
- New submissions published.
- Approval decisions.
- Guest link revocation.
- Submission closure, if implemented.

Required email notifications:
- Brief invitation and confirmation request.
- New submission invitation.
- New client comment or reply relevant to the professional.
- Professional response relevant to the client.
- Request for changes or approval recorded.
- Reminder before/after a review due date, using basic reminder timing.

A sophisticated notification center, digests, push notifications and complex notification rules are OUT OF SCOPE.

---

## 5. Core domain concepts and data model

### 5.1 Key domain definitions

| Concept | Definition | Important distinction |
|---|---|---|
| Workspace | Tenant boundary for a person or studio | All professional-owned project data belongs to a workspace |
| Client | Client organization/person record managed by the studio | Not necessarily a ProofDesk user account |
| ClientContact | Contact identity belonging to a Client | Verified email is used for guest actions |
| Project | Container for one client engagement/design project | Not a full task-management project plan |
| ProjectBrief | The current logical brief for a project | Each submitted/confirmed revision is versioned |
| BriefVersion | An immutable version of the brief content | Confirmation applies to a specific version |
| Asset | Logical design file or deliverable | Holds multiple immutable AssetVersions |
| AssetVersion | One exact uploaded file revision | Comments and approvals refer to exact versions |
| Submission | Published review round and snapshot | Central Phase 1 object; immutable after publication |
| SubmissionItem | Ordered reference to an exact AssetVersion in a Submission | Must not reference a moving/latest version pointer |
| SubmissionRecipient | Invited client contact and role for one Submission | One Primary Approver maximum per submission |
| GuestAccessLink | Secure, scoped access credential | Revocable and recipient-specific |
| VerificationChallenge | One-time email verification challenge | Required before client writes/decisions |
| FeedbackThread | Discussion attached to an overall submission or an asset location | Anchored to exact version when location-specific |
| Comment | A message within a FeedbackThread | Client-facing; no private thread in Phase 1 |
| ApprovalDecision | Primary Approver's decision on a Submission | Applies to exact immutable snapshot |
| ActivityEvent | Append-oriented record of important project actions | Used for history and traceability |
| Notification | Email delivery record/task | Must not become a source of truth for domain state |

### 5.2 Minimum logical entities

The Phase 1 logical model includes:

- User
- Workspace
- WorkspaceMembership
- Client
- ClientContact
- Project
- ProjectParticipant
- ProjectBrief
- BriefVersion
- Asset
- AssetVersion
- Submission
- SubmissionItem
- SubmissionRecipient
- GuestAccessLink
- VerificationChallenge
- FeedbackThread
- Comment
- ApprovalDecision
- ActivityEvent
- Notification

The final physical schema may differ to fit the existing repository and database, but it must preserve these product concepts and invariants.

### 5.3 Core relationships

```text
Workspace
  ├── WorkspaceMembership ── User
  ├── Client ── ClientContact
  └── Project
        ├── ProjectParticipant
        ├── ProjectBrief
        │     └── BriefVersion
        ├── Asset
        │     └── AssetVersion
        └── Submission
              ├── SubmissionItem ── exact AssetVersion
              ├── SubmissionRecipient ── ClientContact
              ├── GuestAccessLink
              ├── FeedbackThread
              │     └── Comment
              ├── ApprovalDecision
              └── ActivityEvent
```

### 5.4 Non-negotiable data invariants

1. Workspace is the tenant boundary. Every workspace-owned record must be associated with a workspace, directly or through a validated parent relationship.
2. Every project operation must verify that the authenticated professional belongs to the owning workspace and has the required role.
3. An Asset is a logical object. An AssetVersion is immutable file history.
4. SubmissionItems reference exact AssetVersion IDs, never a mutable `latestVersion` pointer.
5. A published Submission snapshot is immutable.
6. A FeedbackThread's location is bound to the exact AssetVersion and optional PDF page/coordinates.
7. Comments on older versions remain on those versions; there is no automatic migration.
8. ApprovalDecision references one exact published Submission snapshot.
9. A new Submission has no inherited approval.
10. Guest tokens are scoped, unguessable, revocable, and limited to the invited submission/project and recipient permissions.
11. Email verification is required before guest mutation or approval operations.
12. Studio-only fields, including Included/Potential scope change, are never returned to guest endpoints.
13. Domain state is stored in authoritative database records; email notifications and activity projections do not replace the authoritative state.
14. Audit history must not be silently rewritten when a new version, submission or decision is created.

### 5.5 Suggested lifecycle semantics

The following are baseline lifecycle semantics. Agents may choose implementation-specific enum names, but must preserve the behaviour.

**Brief:** draft → sent → client_submitted → awaiting_confirmation → confirmed. A later change creates a new BriefVersion and a new confirmation cycle; do not overwrite a confirmed version.

**Asset:** logical asset remains; each upload adds a new immutable version. Older versions remain addressable.

**Submission:** draft → published → (approved OR changes_requested). A subsequent review is a new Submission. If the studio closes or supersedes an earlier submission, preserve its published state and decision history; do not erase it.

**Feedback thread:** open ↔ resolved. Replies append to the thread. Resolution status may change, but existing messages remain.

**Approval decision:** append-only. Do not edit a past decision to represent a later review. A later decision belongs to a later submission.

If implementation requires more statuses, the supervisor must confirm they represent real product states rather than incidental UI states.

---

## 6. UX and interaction principles

### 6.1 The work is the interface

- The client review canvas is the highest-priority screen in the product.
- Design files occupy the majority of the available space.
- Comments and review controls should be accessible without dominating the work.
- Client review must feel like viewing a polished design presentation, not using an enterprise project-management tool.
- Professional administration can be denser, but should remain focused on the project and review work.

### 6.2 Reduce guest friction

- No client account creation as a prerequisite.
- Make invited project and submission context obvious.
- Make verification understandable and low-friction.
- Make the next action explicit: comment, reply, request changes or approve.
- Support mobile screens and touch interactions.

### 6.3 Keep professional workflows efficient

- A compact home view should surface projects and items needing attention.
- The project workspace should organize brief, assets, submissions and activity without becoming a generic PM board.
- Submission creation should reuse existing project/client information and avoid duplicate data entry.
- Feedback should be visible in one review inbox and link back to its location.
- Uploading a revised file should be straightforward and should never hide or replace prior versions.

### 6.4 Required screen groups

**Professional side**
1. Sign-up, sign-in, email verification and password reset.
2. Workspace home with projects and a compact needs-attention list.
3. Project overview with client, stage, brief status, submissions and recent activity.
4. Brief editor and confirmation status.
5. Asset upload/library and version history.
6. Submission builder and guest preview.
7. Submission review inbox with comments, replies, status and scope classification.
8. Revision publishing and approval history.
9. Minimal workspace member/settings screen.

**Client side**
1. Guest link entry and email verification.
2. Brief completion/confirmation page.
3. Submission review canvas.
4. Comment pin and thread/reply interaction.
5. Approve/request-changes confirmation.
6. Submission history for that project, restricted to the invited client's authorized visibility.

### 6.5 Required interface states

Specialist agents must account for:
- Loading and upload progress.
- Empty projects, no submissions and no feedback.
- Draft versus published submission.
- Expired, invalid and revoked links.
- Verification required, verification sent, invalid/expired code and verified identity.
- File upload failure, unsupported preview format and retry.
- PDF/image loading and rendering failures.
- Resolved and open feedback.
- Request-changes and approval confirmation states.
- Permission denied and inaccessible project states.
- Due date passed and review closed states where implemented.

---

## 7. Security, privacy and trust requirements

These are product requirements, not optional implementation enhancements.

### 7.1 Tenant and authorization security

- Strict workspace/project tenant isolation must be enforced server-side.
- Every read, write, upload, download, comment, submission and approval operation must perform authorization checks.
- Never rely solely on hidden UI elements or client-supplied workspace/project IDs.
- A user from another workspace must not access project records or files by guessing identifiers.
- Guest access must be restricted to explicitly invited submissions and recipient permissions.

### 7.2 Guest link security

- Tokens must be cryptographically unguessable and stored/handled safely.
- Links must be scoped to the intended project/submission and recipient.
- Links must support revocation and, where implemented, expiry.
- Email verification must be enforced by the server before comments, replies, change requests or approvals.
- A forwarded link must not permit a different email identity to impersonate the invited recipient.
- Revoking access must prevent subsequent access and writes; cached or previously loaded data must not be treated as continuing authorization.

### 7.3 Version, comment and approval integrity

- Published submissions are immutable snapshots.
- Old file versions and old comments remain associated with one another.
- Approvals must point to exact submission snapshots and asset versions.
- Approval and important activity history must be append-only or otherwise tamper-evident within the chosen architecture.
- A new upload or new submission must not rewrite old approval evidence.

### 7.4 Data and file handling

- Original file downloads are available only to authorized workspace/project users and invited recipients with access.
- Validate file type, size and content as appropriate; do not trust file extensions alone.
- Use safe storage and delivery patterns for uploaded files.
- Use malware scanning where supported by the selected infrastructure.
- Use HTTPS in transit and encryption at rest through the selected infrastructure.
- Provide automated backups and test restoration before general availability.
- Define retention and deletion behaviour before public launch; do not silently delete content required for an active approval record.

### 7.5 Privacy and UI wording

- Do not expose internal scope classification to clients.
- Do not suggest that brief confirmation or the Phase 1 approval action is a legally binding contract or e-signature.
- Clearly explain the subject and scope of each approval.
- Display timestamps with timezone-aware behaviour.

---

## 8. Notifications and activity requirements

### 8.1 Notifications that must exist

| Trigger | Recipient |
|---|---|
| Brief invitation | Invited client contact |
| Brief submitted / ready for professional review | Relevant project professional(s) |
| Confirmation requested | Designated client contact |
| New submission published | All invited reviewers and primary approver |
| New client comment/reply | Relevant professional(s) |
| Professional reply | Relevant client participant(s) |
| Changes requested | Relevant professional(s) |
| Submission approved | Project professional(s) and relevant client participants |
| Review reminder | Invited recipients who have not completed the relevant action, according to basic reminder rules |

The exact recipient-selection implementation must respect project and submission authorization. Avoid notifying people who no longer have access.

### 8.2 Activity history

Activity events should be generated by successful domain actions, not by frontend assumptions. At minimum, important events listed in Section 4.8 should be retrievable in project context.

A notification delivery failure must not undo a comment, publication or approval that has already been persisted. Delivery status and retry handling should be separate from domain state.

---

## 9. Explicit Phase 1 exclusions

The following are OUT OF SCOPE. Do not implement them as part of the first release without an explicit product-owner scope change.

### Business management
- Full CRM, lead pipeline or contact marketing.
- Proposals, quotations, contracts, invoicing, expense tracking or payments.
- Procurement, inventory, product sourcing and supplier management.
- Time tracking, resource planning, Gantt charts or general task management.

### Advanced collaboration and approvals
- Full client accounts and multi-studio client dashboards.
- Complex permission matrices.
- Multiple required approvers, sequential approval chains or all-signers-required workflows.
- Legal e-signature integration.
- Private internal comment threads or private notes on client submissions.
- Option-voting/decision engine beyond presenting multiple files and collecting ordinary feedback.
- Automatic migration of comments between versions.
- Freehand markup, arrows, rectangles, measurement tools, compare overlays or drawing takeoff.

### Advanced viewers and integrations
- CAD, DWG, Revit, IFC, BIM, 3D viewers or authoring.
- Video, audio, slide-deck, Figma or live-website proofing.
- Google Drive, Dropbox, Slack, WhatsApp, CAD or PM integrations.
- Real-time multi-user editing or collaborative cursors.

### Automation and commercial expansion
- AI feedback summaries, change detection or AI-generated responses.
- Custom brief/form builder or template marketplace.
- White-labeling and custom domains.
- Native mobile apps and push notifications.
- Advanced analytics or configurable workflow automation.
- Self-serve subscription billing in the initial pilot.

Unsupported file types may be downloadable attachments, but must not be represented as supported review formats.

---

## 10. Phase 1 definition of done and pilot validation

### 10.1 End-to-end acceptance scenario

Phase 1 is complete only when this scenario works end to end:

1. A studio owner creates a workspace and project, adds a client and invites a colleague.
2. The studio prepares and sends a brief; the client opens it without an account, verifies their invited email, completes it and submits it.
3. The studio reviews the brief and requests confirmation; the client confirms the relevant brief version.
4. The studio uploads a PDF and images, previews them and publishes a submission with stage, objective, recipients and due date.
5. The client opens the submission on a phone, views the work, adds an anchored comment and a reply, then requests changes.
6. The studio sees feedback in one place, responds, resolves relevant threads, classifies a request as Included or Potential scope change, uploads a new AssetVersion and publishes a follow-up submission.
7. The client reviews the new submission and the Primary Approver approves it.
8. The studio can retrieve exactly which submission and AssetVersions were approved, by whom and when.
9. The first submission and its comments remain unchanged and accessible as history.
10. Revoking the guest link prevents further access; a different workspace cannot access the project or files.
11. All required email notifications are attempted and the important domain actions appear in the project timeline.

### 10.2 Pilot success measures

These are initial validation targets, not market benchmarks:
- 3–5 pilot studios complete at least one real project cycle.
- At least 3 studios use ProofDesk with an actual external client, not just internal testing.
- A client can open, understand and complete the review without a walkthrough from the architect.
- Professionals report less effort consolidating feedback and retrieving approval evidence than in their previous workflow.
- At least 2 pilot studios demonstrate willingness to pay at a tested price.

Feature completion alone is not product-market-fit evidence.

---

## 11. Implementation and delegation protocol

### 11.1 Before assigning work

The supervisor should:
1. Identify the exact user workflow and product requirement being implemented.
2. Inspect the repository and identify existing components, services, entities, APIs and conventions.
3. Trace the existing or proposed flow across frontend, backend, persistence, storage, permissions, events and notifications.
4. Identify the relevant domain entities and invariants from this document.
5. Define acceptance criteria and tests before delegation.
6. Break work into independently reviewable tasks with explicit dependencies and file/module ownership where practical.
7. Identify integration points and contracts shared by agents.

### 11.2 When delegating to specialist agents

Each agent task should include:
- Relevant product requirement and section of this document.
- Intended user and user action.
- In-scope behaviour and explicit exclusions.
- Existing repository context and files/modules to inspect.
- API/data contracts and permissions that must be preserved.
- Acceptance criteria and required tests.
- Dependencies on other agent work.
- Required output: findings, proposed changes, implementation, tests, and known limitations.

Agents should not receive vague tasks such as “build the review system” without the relevant workflow, domain rules and acceptance criteria.

### 11.3 Integration review

The supervisor must review the combined implementation for:
- A single coherent data model across frontend and backend.
- Consistent API request/response contracts.
- Correct tenant isolation and role/recipient permissions.
- Immutable AssetVersion and Submission behaviour.
- Correct pin coordinate and PDF page semantics.
- Correct guest verification and token scoping.
- Correct single-approver behaviour.
- Correct internal-only scope classification visibility.
- Correct append-only approval/history behaviour.
- Consistent loading, empty, error, success and permission-denied states.
- Tests covering both allowed and denied access paths.

### 11.4 Testing strategy

At minimum, require:
- Unit tests for domain rules and state transitions.
- Integration tests for project/workspace authorization.
- Integration tests for guest token scoping, verification and revocation.
- Tests proving a published Submission cannot be silently mutated.
- Tests proving SubmissionItems reference exact AssetVersions.
- Tests proving comments remain attached to the original version and location.
- Tests proving a new Submission does not inherit prior approval.
- Tests proving only the Primary Approver can approve.
- Tests proving internal scope classifications are not returned to guest APIs.
- End-to-end test for the complete brief-to-approval workflow.
- Mobile/responsive review-flow testing.

### 11.5 Handling uncertainty and proposed changes

If a specialist agent identifies an ambiguity:
- First check whether this document already answers it.
- If it does not, present the smallest implementation assumption that preserves the end-to-end workflow and does not expand scope.
- Mark the assumption explicitly for supervisor review.
- Do not silently create a new user role, workflow state, permission type or feature.

If an agent recommends an out-of-scope feature:
- Record it as a future consideration only.
- Explain what current Phase 1 user outcome it would improve, if any.
- Do not include it in the active implementation backlog without product-owner approval.

---

## 12. Open technical decisions — not product-scope permission

The following may be decided by the technical team after inspecting the repository. They are not permission to change product behaviour:

- Database and ORM representation of the logical domain model.
- Exact API style and endpoint naming.
- Object storage provider and signed-download strategy.
- PDF rendering/viewer library.
- Image processing and thumbnail strategy.
- Email provider and delivery/retry implementation.
- Token generation, storage and verification implementation details.
- Snapshot integrity approach, such as immutable records, canonical snapshot payloads and/or content hashes.
- File size, storage and retention limits, to be finalized from pilot and infrastructure evidence.
- Exact enum names and internal event architecture.

Technical decisions must preserve the product invariants defined above. The supervisor should document important architecture decisions separately rather than embedding unapproved product scope changes into this document.

---

## 13. Future possibilities — not Phase 1 commitments

Potential later opportunities, subject to customer evidence and explicit prioritization:
- More advanced PDF markup and comparison.
- Multi-approver and sequential approval workflows.
- Private internal review threads.
- Custom brief templates and configurable design stages.
- Enhanced scope/change-order workflows.
- Client accounts and cross-project client history.
- CAD/BIM/3D model review.
- Video and presentation proofing.
- AI-assisted feedback organization and summaries.
- Integrations with file storage, calendars and studio tools.
- Subscription billing, storage quotas and advanced plans.
- White-labeling and custom branding.
- Expansion into other creative industries.

Future possibilities must not influence Phase 1 architecture in a way that adds unnecessary complexity. Prefer clean extension points over premature generalized workflow engines.

---

## 14. Quick reference — non-negotiable product truths

For rapid retrieval by the supervisor and specialist agents:

1. ProofDesk is architecture-first, initially for independent architects and small residential practices.
2. The product completes: **brief → submission → feedback → revision → approval**.
3. The work is the interface; the client review canvas is the highest-priority experience.
4. Workspace is the tenant boundary.
5. Professional roles are Owner and Member only in Phase 1.
6. Client roles are Reviewer and one Primary Approver per submission.
7. Clients use secure guest links; they verify the invited email before commenting or making decisions.
8. Phase 1 preview formats are PDF, JPG/JPEG and PNG.
9. Asset and AssetVersion are separate; versions are immutable.
10. Submission is the central published review-round object.
11. A published Submission is an immutable snapshot of exact asset versions, order, instructions, stage, recipients and due date.
12. Feedback is pin-and-thread only, anchored to an exact AssetVersion and optional PDF page.
13. Feedback categories are Question, Change Request, Preference and Concern.
14. All submission comments are visible to invited client reviewers and the studio; there are no private internal comment threads in Phase 1.
15. The studio can internally classify a Change Request as Included or Potential scope change; this is not visible to clients and is not an automatic contractual decision.
16. New uploads create new AssetVersions. Old comments remain on old versions and never auto-migrate.
17. A follow-up review is a new Submission.
18. Only the designated Primary Approver can approve a submission.
19. Approval records the exact Submission snapshot and AssetVersions, verified approver identity and timestamp.
20. A new Submission never inherits an old approval.
21. Approval and brief confirmation are not represented as legal e-signatures or contracts.
22. Tenant isolation, server-side authorization, secure guest access and revocation are mandatory.
23. Phase 1 excludes CRM, general task management, procurement, invoicing, CAD/BIM, advanced markup, AI, integrations and self-serve billing.
24. Phase 1 is done only when a real studio can complete the end-to-end workflow and retrieve its decision history.
25. Do not add features just because a competitor has them. Build only what supports the validated Phase 1 outcome.

---

## 15. Final product statement

**ProofDesk enables architecture practices to present design work, collect structured client feedback, manage revision rounds and record approval of the exact submission being reviewed.**

Its Phase 1 success depends on completing this workflow simply, securely and reliably — not on the number of modules or file formats supported.
