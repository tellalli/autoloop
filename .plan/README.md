# AutoLoop planning

Keep all project planning in this directory: implementation plans, design notes, research, open questions, and decisions.

Use a descriptive Markdown filename for each topic, such as `authentication.md` or `release-workflow.md`. Keep each plan's scope, status, next steps, and unresolved questions up to date.

## Plans

- [Looper workflow](looper-workflow.md): floating chat entry, conversation continuity, confirmation gates, Git brief contents, and revision behavior.
- [Ticket-capture MVP](mvp-ticket-capture.md): browser chat/drafts, local CSV persistence and role visibility, Git-ready brief, and remaining live configuration checks.
- [Capability catalog](capability-catalog.md): how chat explains verified APIs, frontend libraries, dependencies, and scope limits.
- [Project scope](scope.md): current local/frontend boundary, plus the reviewed full-flow source requirements as reference.
- [Workflow and data](workflow-and-data.md): frontend change limits and the deferred full-flow architecture.
- [Implementation plan](implementation-plan.md): active frontend increment and the deferred six-week source schedule.
- [Decisions](decisions.md): local operation, server-environment keys, local CSV storage with Master/Administrator visibility, and deferred pipeline decisions.

## Reviewed sources

- [Customer request to release](<AutoLoop customer request to release.docx>): workflow overview.
- [Proof of concept scope](<AutoLoop proof of concept scope.docx>): detailed experiment scope.

`source-text/` contains paragraph-numbered text extracted from the Word documents for traceable references. `source-assets/` contains their extracted diagrams, reviewed alongside the text. The original Word documents remain unchanged. Planning proposals are in the plans above, separate from the source extracts.

Keep runtime request CSVs, conversations, credentials, and backups out of Git and public assets, including outside `.plan/`. The POC working CSV defaults to the ignored `.data/` directory; an external private directory is optional.
