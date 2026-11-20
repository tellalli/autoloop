# AutoLoop scope: local frontend development

Status: browser-based ticket-capture MVP implemented; broader pipeline deferred.
Updated: 2026-11-19.

## Current scope

The project owner has confirmed that AutoLoop will run locally and feature development is limited to the frontend. API and tool development is out of scope for now. These instructions override the broader proof-of-concept deliverables in the Word documents.

- Run the existing AutoLoop app locally; hosted environments and production deployment are deferred.
- Limit requested feature changes to screens, components, styling, browser interactions, accessibility, and related frontend tests.
- Exclude new or changed API endpoints/contracts, backend services, tool implementations, and external integration capabilities from feature scopes. Requests that need those changes must be narrowed or deferred.
- Retain the existing BeWhere authentication foundation. Local operation does not mean offline operation or removal of the previously requested login.
- Do not treat frontend status displays or hidden controls as proof of a completed external action or server-enforced authorization.

The owner selected a browser-based POC without a separate service. The implemented MVP opens chat, drafts a scoped ticket, confirms/saves it, and prepares a human-reviewed Markdown issue draft. The latest instruction adds local CSV persistence in the existing Vite runtime: Master reads all saved tickets; Administrator and other roles read only their own user/account records. Drafts remain browser-local. Download CSV provides an optional filtered snapshot without folder setup. Vite also verifies the BeWhere login response and forwards AI calls using server environment keys. This supporting POC behavior is distinct from new product APIs/tools, which remain excluded. See [mvp-ticket-capture.md](mvp-ticket-capture.md) and [capability-catalog.md](capability-catalog.md). Actual GitHub submission and coding/review/release orchestration remain deferred.

## Full-flow source outcome

Build the smallest working version of the complete customer-request-to-release loop. A customer describes a need in chat; AI clarifies it, drafts a scope, and implements approved work. People retain triage, scope approval, engineering review/merge, and customer preview decisions.

The source proof of concept covers one repository and one product, runs 5–10 real or realistic requests, and calls for at least three releases through all 11 steps over six weeks. These remain reference targets, not acceptance criteria or a committed schedule for the narrowed frontend increment. Manual initiation is allowed in that source plan; simulated steps do not establish real integration or release evidence. [B: P004–P008, P035, P049, P142–P144]

## Sources and precedence

| Source | Reviewed material | Reference |
| --- | --- | --- |
| A | [AutoLoop customer request to release.docx](<AutoLoop customer request to release.docx>), dated November 18, 2026; 11-step overview and diagram | [Extracted text](source-text/customer-request-to-release.md), P001–P063; [diagram](source-assets/customer-request-to-release-image1.png) |
| B | [AutoLoop proof of concept scope.docx](<AutoLoop proof of concept scope.docx>), dated November 18, 2026; detailed scope, roles, safeguards, metrics, and schedule | [Extracted text](source-text/proof-of-concept-scope.md), P001–P190; [workflow](source-assets/proof-of-concept-scope-image1.png); [milestone diagram](source-assets/proof-of-concept-scope-image2.png) |

The Word exports are the reviewed sources. The original [artifact A](https://claude.ai/artifact/WXh44QvU4ZGthAJkpbsW8X) and [artifact B](https://claude.ai/artifact/HFnUL2j3YBJANYDaHGQ983#104e16a3-33b9) remain provenance links; they could not be read directly. Paragraph references below refer to the extracted text. Diagrams were inspected separately.

Current project instructions take precedence over the source documents where they differ. Recommendations below are labeled as proposals; no product features have been implemented by this planning review.

## Existing foundation

AutoLoop has the React/TypeScript/Vite app, public landing page, BeWhere sign-in, session persistence/sign-out, and an authenticated `/app` workspace. The workspace includes chat, editable ticket capture, My requests/All tickets, browser draft recovery, local CSV persistence/download, and human-reviewed issue-draft export. A live DeepSeek exchange succeeded; real BeWhere Master/Administrator sign-in remains to be verified.

There is no separate backend service, GitHub automation, triage administration, or feature-flag rollout. None of `atagforbusiness`'s business features or customer data was imported. Server-side CSV storage, verified-session authorization, and model forwarding are part of the existing Vite runtime.

## Reconciliation of the documents with this project

| Topic | Source position | Scope interpretation |
| --- | --- | --- |
| App and frontend | Extend the existing Lite portal using Bootstrap. [B: P037, P055, P066, P180–P181] | Retain the fresh AutoLoop React foundation already requested. Reuse authentication only; do not import the old portal's features or data. |
| Demo repository | One repository, with useful automated tests. [B: P005, P050, P146] | Proposed: AutoLoop itself is both the orchestration app and demo product. Target repository selection remains open (D-01). |
| CSV ownership | Backend is the only writer, but direct manual CSV editing is also suggested. [B: P039–P040, P078, P101] | Proposed: a small triage page sends human decisions to the backend. No direct CSV edits while the app is running. |
| Release | Step 11 is automated; unattended production deployment is excluded. [A: P053–P062; B: P051] | Automate status/flag effects only after recorded human gates. Engineer-controlled deployment creates a preview; merge alone does not release the feature to everyone. See workflow and D-05. |
| Customer information in GitHub | Requests become issues, but CSV/transcripts stay private and away from the coding agent. [B: P081, P103, P132, P136] | Proposed: issues contain a human-reviewed functional brief and opaque request ID, without transcripts, customer identity, credentials, or private attachments. |
| Product knowledge | Chat suggests existing features and finds duplicates. [B: P038, P070] | Start with an approved AutoLoop feature catalog and docs reflecting this fresh app. Do not invent functionality or import old product data. Duplicate suggestions must not reveal another customer's request. |
| Budget | Formal accounts/spend arrangements are deferred; spend limits and weekly checks are still required. [B: P138, P174, P186] | Keep procurement processes out of scope, but agree a practical experiment cap, owner, and stop procedure before paid runs. |

## Users and authority

| Role | Responsibility | Boundary |
| --- | --- | --- |
| Customer/requester | Chat, confirm submission, view their requests, answer scope questions, try a preview, confirm or report missing behavior | No direct access to the coding agent, repository controls, or other customers' records. |
| Product owner | Triage; approve/revise/reject scope; choose preview users/groups; execute release after acceptance | Named application authority; do not assume a BeWhere API role automatically grants it. |
| Engineer | Technical scope input, review code/tests after automated review, merge or request changes, operate deployment | Human review and passing checks remain mandatory. |
| Sponsor | Review pilot evidence and decide what happens after the experiment | No extra day-to-day workflow gate. |

One product owner and one engineer may cover the four decisions. Pilot: 1–3 friendly customers, with team members acting as customers if necessary. Names and availability are pending. [B: P104–P129, P163–P165, P178]

## Full-flow reference capabilities and acceptance criteria

The register below preserves the reviewed full-flow requirements. It is not the active implementation backlog for this increment. Only frontend work consistent with the current scope can proceed; backend/API/tool/integration deliverables are deferred pending clarification and any later scope change. See [implementation-plan.md](implementation-plan.md) for the active frontend work boundary.

| ID | Capability and source | Observable acceptance |
| --- | --- | --- |
| S-01 | Authenticated workspace and authorization. Current project instructions; B P055, P135 | Live sign-in works; backend verifies identity independently of browser storage; customer and operator routes enforce ownership and role checks. |
| S-02 | Request clarification chat. B P038, P069–P070, P093–P094 | Through the backend, DeepSeek Flash asks follow-ups, consults approved docs/features, and proposes a summary. It never promises delivery/dates or accesses code/admin tools. |
| S-03 | Confirmed submission. A P013–P020; B P069, P093 | An explicit customer confirmation creates exactly one Submitted request with an ID and private transcript. An unconfirmed conversation cannot enter triage. |
| S-04 | Private CSV log and transcripts. B P074, P095–P103 | Only the backend writes records; restart preserves them; simultaneous submissions do not overwrite one another; files remain outside the checkout, with daily backups and a verified restore before the pilot. |
| S-05 | My requests and request detail. B P045, P055, P057 | A requester sees their own summaries, current state, clarification questions, and preview availability. Another customer's IDs, transcripts, or preview grants cannot be accessed. |
| S-06 | Human triage. A P021–P028; B P077–P082, P110–P113 | Product owner accepts, links to a canonical duplicate, or declines with a reason. Accepted requests create one linked issue; retries do not create duplicates. |
| S-07 | Scope drafting and customer clarification. A P029–P036; B P057, P085 | Codex posts a scope/acceptance criteria and intent questions to the issue. Questions and customer answers pass through the app with a reviewed, minimal issue summary. No code changes occur. |
| S-08 | Human scope gate. A P062; B P115–P117, P131–P134 | Only an authorized human can apply `approved` to a reviewed scope revision. A test of an absent, stale, or unauthorized approval cannot start a build. |
| S-09 | Branch build and pull request. A P037–P044; B P085–P086, P133 | Codex changes its own branch, runs relevant tests, and opens a linked PR showing the approved scope. It cannot push to main, merge, deploy, or read runtime customer files/secrets. |
| S-10 | Automated first review, human engineering gate. B P120–P126, P134 | Codex review is recorded first; passing required checks and an engineer's approval precede merge. Automated review cannot satisfy the human gate. |
| S-11 | GitHub status synchronization. B P081–P082 | Authenticated, validated events update only the linked request; replaying events is safe; unrelated or older events cannot advance it. Manual retry/reconciliation uses the same backend rules. |
| S-12 | Selected-user preview. A P049–P052; B P088–P090, P122–P125 | Product owner grants a default-off feature to validated users/groups. A merged/deployed change remains unavailable to others. Requester confirmation or feedback is recorded against the previewed revision. |
| S-13 | Release and customer status. A P053–P062; B P051 | After merge, required checks, deployment evidence, and requester acceptance, an authorized human initiates release to the agreed audience. Only then set Shipped and its timestamp. Failed checks/feedback block progression. |
| S-14 | Experiment measurement. B P007–P033, P046 | For each pilot request, record the 11 steps, four decisions, outcomes, human effort, revisions, and lead time; report agreed measures with denominators and exceptions. |
| S-15 | Operational controls. B P130–P140 | Verify isolation, backend-only credentials, message/request limits, a spend stop procedure, daily backups, branch protection, and an agent kill switch before the pilot. |

The stricter checks on retries, approval revisions, persistence, and event ordering are proposed implementation criteria needed to make the documented gates dependable, rather than additional product features.

## Frontend screen candidates

The implemented screens retain public/login pages and add chat, editable ticket summary, My requests/All tickets list/detail, and reviewed Markdown preview/copy/download. Broader triage, agent review, and release/preview administration remain later work. D-16 through D-18 record the local runtime, CSV storage, and role visibility choices.

## Excluded from the current increment

- New or changed product APIs, backend services, tools, and orchestration integrations. Supporting Vite behavior is limited to environment-backed model forwarding, the existing BeWhere login exchange/session, and the owner-requested local ticket CSV/access checks.
- Hosted runtime, cloud infrastructure, and production deployment; AutoLoop runs locally.
- Production database, multi-repository/multi-product routing, and fully automatic orchestration of every step. [B: P048–P050]
- Unattended production deployment, AI merge authority, and removal of any human gate. [B: P051, P126, P133]
- Billing, pricing, contracts, voting boards, and a plugin marketplace. [B: P052–P053]
- Old portal features/data, broad account administration, or new BeWhere device/data features. Current project direction.
- Production-scale tenancy, queue infrastructure, sophisticated reporting, and broad third-party connectors. Proposed deferrals; revisit only if needed for the pilot.

After the proof of concept, consider a database migration, stronger orchestration, broader hosting, and additional repositories/products only if the measured results justify them. No later feature is a committed roadmap item.

## Source experiment success measures (not current frontend exit criteria)

| Measure | Source target | Definition proposed for this pilot |
| --- | --- | --- |
| Full-flow releases | At least 3 of 5–10 requests | Count requests with evidence for all 11 steps and four human decisions, reaching Shipped. Keep merged duplicates/declines visible in totals, not as releases. |
| Triage usability | Percentage TBD | Accepted without clarification / all triaged submissions; report duplicate/decline reasons separately. |
| Scope quality | Percentage TBD | Scopes approved without a human rewrite / scopes reviewed. Track AI revisions and human edits separately. |
| Build quality | Percentage TBD | Merged PRs requiring at most one engineering change round / PRs reviewed; report unmerged/closed PRs separately. |
| Human effort | Under TBD minutes/request | Sum time spent on triage, scope approval, engineering review, and preview decision. Record operational/setup time separately so it is not hidden. |
| Speed | Submission to preview under TBD days | First eligible preview timestamp minus submitted timestamp; report blocked/waiting time and requests that never reach preview. |
| Scope gate integrity | Zero unapproved code changes | No coding-agent implementation without a matching, human-approved scope; keep approval revision and build evidence. |

Source: B P007–P033. Definitions above are proposals for the full-flow experiment. The five numeric placeholders remain unset. They do not block frontend planning, and simulated UI runs must not be counted as actual releases.

## Open decisions and next step

The three capture deliverables use browser UI/drafts and Vite-managed local CSV, access checks, and AI forwarding. Verify live BeWhere Master/Administrator logins and their ticket visibility. Webhooks, GitHub writes, agent runs, hosted rollout, and a separate backend remain deferred.

The broader workflow/data proposal remains in [workflow-and-data.md](workflow-and-data.md) as reference. The active boundary and deferred six-week sequence are distinguished in [implementation-plan.md](implementation-plan.md).
