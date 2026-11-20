# ProofDesk — Phase 1 Scope Baseline

**Version:** 1.0  
**Date:** 20 November 2026  
**Status:** Proposed product baseline for design and implementation planning

## 1. Phase 1 objective

Enable a solo architect or small architecture/interior-design studio to complete one real client-facing design cycle in ProofDesk:

**Capture the brief → present design work → collect structured feedback → issue a revision → record approval of the exact submission.**

Phase 1 is a deliberately narrow, end-to-end product. It is not a full practice-management suite, a CAD/BIM platform, or a generic project-management application.

### Target customer

- Primary: independent architects and small residential architecture practices (approximately 1–15 people; a targeting hypothesis, not an industry statistic).
- Secondary: small interior-design studios with a similar client presentation and approval process.
- Buyer: studio owner / principal architect.
- Daily user: architect, designer or project lead.
- External user: homeowner or other client decision-maker.

### Core promise

ProofDesk helps a design practice present work, collect actionable client feedback, manage review rounds and preserve decisions against the exact work reviewed.

## 2. Product principles

1. **The work is the interface.** The design canvas must dominate the client experience; administration stays secondary.
2. **One complete workflow beats many disconnected features.** Every Phase 1 feature must support the brief-to-approval journey.
3. **Clients should not need an account.** A secure guest link is the default; verified identity is required before making comments or decisions.
4. **A published submission is immutable.** Its files, versions, instructions and reviewers are a historical snapshot.
5. **Feedback is not an instruction.** The professional decides how to respond and whether a request affects scope.
6. **Approval is specific.** An approval applies to one published submission and its exact asset versions, not to a project generally.
7. **Keep the product focused.** Do not recreate CRM, procurement, task management, CAD authoring or full construction collaboration.

## 3. Phase 1 user roles

### Workspace roles

- **Owner:** creates the workspace, manages members and workspace settings, and owns all workspace projects.
- **Member:** can create and work on projects, briefs, submissions and feedback. No granular project permissions in Phase 1.

### Client roles

- **Reviewer:** can view published submissions, add/reply to comments and request changes.
- **Primary approver:** one designated client contact per submission who can also approve that submission.

Multiple reviewers are allowed, but Phase 1 supports only one primary approver per submission. No sequential or all-signers-required approval chain.

### Identity and access

- Professionals sign in with an email-based account. Basic password reset/email verification is included.
- Clients access a recipient-specific secure link without creating an account.
- A client may view the link before verification, but must verify their invited email with a one-time code before commenting, requesting changes or approving.
- A workspace member can revoke a guest link. Links must use unguessable tokens and must be scoped to the intended project/submission and recipient.
- No public indexing or unauthenticated project browsing.

## 4. Phase 1 end-to-end workflow

### Step 1 — Create workspace and project

A professional can:
- Create a personal or studio workspace.
- Invite a colleague as a member.
- Create a project with name, client, optional project location, project type and current design stage.
- Add one or more client contacts, including a primary client contact.
- Choose a simple project stage from defaults: Concept, Schematic Design, Design Development, Final Design. A custom stage label may be entered, but there is no configurable stage builder.

### Step 2 — Capture and confirm a lightweight brief

Include one fixed, architecture-oriented brief form. It is not a form-builder.

Fields:
- Project goals and desired outcome.
- Project type and areas/rooms included.
- Requirements and priorities.
- Constraints (for example, site, practical or design constraints).
- Budget range (optional; informational, not a quote).
- Style/preferences and things to avoid.
- Reference links and uploaded reference images/PDFs.
- Additional notes.

Flow:
1. The professional prepares the brief and sends a secure guest link.
2. The client completes or corrects the requested information and submits it.
3. The professional reviews it and sends the finalized brief for confirmation.
4. The designated client confirms the brief; ProofDesk records who confirmed and when.

A confirmed brief is versioned. Later changes create a new brief version and confirmation event. Confirmation records shared design requirements; it is not a contract, fee acceptance or legal signature.

### Step 3 — Upload and manage design assets

Phase 1 preview support:
- PDF (multi-page).
- JPG/JPEG.
- PNG.

Required behaviour:
- Upload, preview and download original files.
- Store a logical asset separately from its immutable versions.
- Uploading a replacement creates a new version; it never overwrites an older version.
- Show version number, upload date and uploader.
- Allow a professional to choose an exact asset version for a submission.

Other file types, if accepted at all, are download-only attachments and are not part of the review experience. CAD, DWG, RVT, IFC, PSD, AI, PPT, video and audio preview are out of scope.

### Step 4 — Build and publish a design submission

A submission is the central Phase 1 object. It represents one formal review round and replaces the need for separate presentation and review-request concepts in the MVP.

The professional can:
- Create a submission within a project and assign a design stage.
- Select one or more exact asset versions.
- Reorder the included files.
- Add a submission title and short context/description.
- State what the client is being asked to review or decide.
- Add review instructions and an optional due date.
- Select invited reviewers and one primary approver.
- Preview the client experience before publishing.
- Publish and notify the invited recipients.

On publication, ProofDesk freezes the selected versions, file order, context, stage, recipients and due date as a submission snapshot. A published submission cannot be silently edited. Corrections require a new submission or a clearly recorded administrative correction that does not alter the historical snapshot.

### Step 5 — Client reviews and gives feedback

The guest review page must be responsive and usable on a phone without creating an account.

The client can:
- View images and multi-page PDFs.
- Zoom and navigate PDF pages.
- Add a pin comment to a precise location on an image or PDF page.
- Add an overall submission comment.
- Reply to an existing comment thread.
- Categorize feedback as Question, Change Request, Preference or Concern.
- See comments and responses relevant to that published submission. All submission comments are visible to the invited client reviewers and the studio; Phase 1 has no private internal comment threads.
- Request changes or approve, if they are the primary approver.

Phase 1 annotation is **pin-and-thread only**. No freehand drawing, arrows, rectangles, measurement tools, text markup or collaborative cursor tools.

Every annotation is attached to the exact asset version and stores normalized coordinates; PDF annotations also store the page index. Comments on an old version remain on that version and are never automatically moved to a newer version.

### Step 6 — Professional responds and manages the revision

The professional can:
- See all open feedback for a submission in one review inbox.
- Open each comment at its anchored location.
- Reply to the client.
- Mark a thread open or resolved.
- Add a simple internal classification to a request: Included / Potential scope change. This is a studio-side status, not a client-facing price or contract determination.
- Upload a new asset version.
- Create and publish a follow-up submission containing the exact new versions.

The new submission becomes the next review round. The prior submission, comments, responses and decisions remain available as history.

Basic revision allowance tracking is included:
- A studio may define an optional number of included review rounds for a design stage.
- When publishing a follow-up submission, the studio marks whether it counts as an included round or an additional round.
- ProofDesk displays the count and history.
- The studio remains responsible for interpreting its client agreement. No automatic fee calculation, contract enforcement or invoicing.

### Step 7 — Approve or request changes

The primary approver can make one of two decisions on a published submission:

- **Approve this submission:** records acceptance of that exact submission and the exact asset versions it contains.
- **Request changes:** requires a reason or at least one feedback comment and returns the submission to the studio for response/revision.

Approval record must include:
- Project and submission identifiers.
- Submission stage and snapshot reference.
- Exact asset-version identifiers.
- Approver's verified email and displayed name.
- Decision and optional note.
- Timestamp.

A new submission does not inherit an earlier approval. Approval of a design stage is not represented as legal e-signature or approval of a construction contract. The UI must state what is being approved.

### Step 8 — Review history and notifications

Provide a simple project timeline showing:
- Brief sent, submitted and confirmed.
- Submission published and recipients notified.
- Comments and replies.
- Threads resolved.
- Changes requested.
- New versions uploaded and new submissions published.
- Approval decisions.
- Link revocation and submission closure.

Email notifications are required for:
- Brief invitation and confirmation request.
- New submission invitation.
- New client comment or reply relevant to the professional.
- Professional response relevant to the client.
- Changes requested or approval recorded.
- Reminder before/after a review due date, with basic configurable reminder timing.

A sophisticated notification center, digests, push notifications and complex rules are not required.

## 5. Required Phase 1 screens

### Professional side
1. Sign-up / sign-in / password reset.
2. Workspace home: projects and a compact needs-attention list.
3. Project overview: client, stage, brief status, submissions and recent activity.
4. Brief editor and brief confirmation status.
5. Asset upload/library with version history.
6. Submission builder and preview.
7. Submission review inbox: comments, replies, status and scope classification.
8. Revision publishing and approval history.
9. Minimal workspace member/settings screen.

### Client side
1. Guest link entry and email verification.
2. Brief completion/confirmation page.
3. Submission review canvas.
4. Comment thread/reply interaction.
5. Approve / request changes confirmation.
6. Submission history for that project, limited to the invited client and intended visibility.

## 6. Core domain model

Keep the Phase 1 model small and version-aware:

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
- SubmissionItem (references an exact AssetVersion)
- SubmissionRecipient
- GuestAccessLink / VerificationChallenge
- FeedbackThread
- Comment
- ApprovalDecision
- ActivityEvent
- Notification

Important relationships and invariants:
- Workspace is the tenant boundary; every project-owned record is scoped to a workspace.
- A Project has one or more brief versions, assets and submissions.
- An Asset has immutable AssetVersions.
- A Submission contains one or more exact AssetVersions and is immutable after publication.
- FeedbackThread and Comment are anchored to an exact AssetVersion and optionally a page/coordinate.
- ApprovalDecision points to one exact Submission snapshot.
- Guest link access is limited to the invited project/submission and recipient permissions.
- Internal classification is separate from client-facing comment text; do not expose studio-only fields to guest APIs.

Do not add a separate Presentation entity, ReviewRequest entity, complex decision engine or generalized workflow builder in Phase 1. The Submission is the published review round.

## 7. Must-have quality, security and operational requirements

- Strict workspace and project tenant isolation, enforced server-side.
- Authorization checks for every project, asset, version, comment, submission and approval operation.
- Secure, revocable, recipient-scoped guest tokens; email verification before client input/decisions.
- Immutable published submission snapshots and append-only approval/activity history.
- Original file access restricted to authorized project participants.
- Comments and approvals cannot be changed by another recipient.
- Internal scope classification must never be exposed through client endpoints.
- HTTPS in transit and encryption at rest through the selected storage/database infrastructure.
- File upload validation, safe file handling and malware scanning where supported by the selected infrastructure.
- Automated backups and a tested restore process before general availability.
- Responsive professional interface and mobile-first client review experience.
- Basic accessibility: keyboard navigation, visible focus, readable contrast and labels for controls.
- Clear upload progress, error states, empty states and retry behaviour.
- Timezone-aware display of deadlines and event timestamps.

## 8. Explicitly out of scope for Phase 1

Do not build these as part of the first release:

- Full CRM, lead pipeline or contact marketing.
- Proposals, quotations, contracts, invoicing, expense tracking or payments.
- General task/project management, Gantt charts, time tracking or resource planning.
- Custom brief/form builder, template marketplace or complex onboarding automation.
- Full client accounts, client dashboard across multiple studios or client-side project portfolio.
- Multiple required approvers, sequential approvals or complex permission matrices.
- Legal e-signature.
- Freehand PDF markup, measurements, compare overlays or drawing takeoff.
- CAD/DWG/Revit/IFC/BIM/3D viewers or editing.
- Video, audio, presentation-deck, Figma or live website proofing.
- Automatic comment migration between versions.
- Studio-only internal comment threads or private notes attached to client submissions (internal status/classification fields are supported).
- Option voting/comparison engine beyond presenting multiple files and collecting ordinary feedback.
- AI summaries, AI change detection or AI-generated responses.
- Google Drive/Dropbox/Slack/WhatsApp/CAD integrations.
- White-labeling, custom domains and advanced branding.
- Native mobile apps, real-time collaboration or push notifications.
- Advanced analytics and configurable workflow automation.
- Self-serve subscription billing in the initial pilot. Founder-managed pilot accounts and manual billing are sufficient until willingness to pay is validated.

## 9. Phase 1 acceptance criteria

Phase 1 is not complete because individual screens exist. It is complete when the following real-world scenario passes from beginning to end:

1. A studio owner creates a workspace and a project, adds a client and invites a colleague.
2. The studio prepares and sends a brief; the client opens it without an account, verifies their email, completes it and confirms the finalized brief.
3. The studio uploads a PDF and images, previews them and publishes a submission with a stage, objective, recipients and due date.
4. The client opens the submission on a phone, views the work, adds an anchored comment and a reply, then requests changes.
5. The studio sees the feedback in one place, responds, resolves relevant threads, classifies a request as included or potential scope change, uploads a new asset version and publishes a follow-up submission.
6. The client reviews the new submission and the primary approver approves it.
7. The studio can later prove exactly which submission and asset versions were approved, by whom and when.
8. The first submission and its comments remain unchanged and accessible as history.
9. Revoking the guest link prevents further access; another workspace cannot access the project or its files.
10. All key events generate the expected email notifications and appear in the project timeline.

### Pilot success measures

Treat these as initial validation targets, not market benchmarks:
- 3–5 pilot studios complete at least one real project cycle.
- At least 3 studios use ProofDesk with an actual external client, not just internal testing.
- A client can open, understand and complete the review without a walkthrough from the architect.
- Professionals report less effort consolidating comments and retrieving approval evidence than in their previous workflow.
- At least 2 pilot studios show willingness to pay at a tested price.

## 10. Release approach

### Phase 1A — End-to-end pilot (build and validate)

Build all required workflow capabilities above, but onboard pilot workspaces manually. Use founder-managed plans and support. Do not block the pilot on automated billing, custom domains or advanced integrations.

### Phase 1B — Public launch hardening

Only after successful pilot cycles:
- Add the selected subscription/payment provider and enforce plan limits.
- Finalize file-size and storage quotas based on actual usage and infrastructure costs.
- Improve onboarding and help content based on observed friction.
- Add export/data-retention controls required for the launch markets.

Phase 1B is launch readiness, not permission to expand the product into project management.

## 11. Definition of done

A real studio can start a project in ProofDesk, collect and confirm a brief, present PDF/image work, receive and respond to anchored client feedback, publish a revision, and obtain a verifiable approval of the exact submission — with secure guest access and preserved history.

**Anything that does not directly support that outcome is deferred.**
