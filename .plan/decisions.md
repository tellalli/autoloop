# Decisions and open questions

Status: local browser POC with Vite-managed CSV, verified-session role filtering, and server-environment AI forwarding.
Updated: 2026-11-19. Source references use A/B from [scope.md](scope.md).

## Latest owner direction

AutoLoop runs locally for now. Feature development is limited to frontend changes; APIs and tools are out of scope. The broader source proposals below do not override this direction. Existing BeWhere sign-in is retained. Backend, integration, data-storage, and live-pilot questions are deferred rather than current frontend blockers.

The owner selected browser-based experimentation without a separate local service and model keys in server environment variables. The latest instruction supersedes download-only storage: the existing Vite server now owns a local ticket CSV, with Master able to read all tickets and Administrator able to read only their own. Browser drafts, filtered CSV downloads, and issue-draft export remain. Actual GitHub submission and the build/review/release pipeline remain deferred.

## Established direction

| Decision | Basis | Implication |
| --- | --- | --- |
| Fresh AutoLoop app, with BeWhere authentication | Current project instructions override B's old Lite/Bootstrap assumption. | Keep React/TypeScript/Vite; import no old product features or customer data. |
| Local execution; frontend feature changes only | Latest project-owner instruction. | No hosted runtime; no API or tool development in feature scopes. |
| Full 11-step experiment with four human decisions | A P004–P062; B P008, P035, P104–P126. | Preserved source ambition; its entire delivery is not committed for the current frontend increment. |
| One repository/product; CSV and private transcript files | B P005, P048–P050, P074, P095–P103. | Source architecture reference; CSV/backend implementation is deferred under the narrowed scope. |
| DeepSeek Flash for chat; Codex for scope/build and first review | B P070, P085–P086, P182. | Source provider choices; no new integration setup is included by this update. Orchestration usage is D-15. |
| Human engineering review remains mandatory | B P120–P126, P133–P134. | Codex reviewing its own work cannot authorize merge. |
| Product owner selects preview users/groups | B P090, P122–P125, P183. | Default-off feature flags; requester acceptance is required before release. |
| DeepSeek processing of customer chat is acceptable for the experiment | B P184. | Do not reopen this source decision by default; still avoid secrets/unnecessary identity in prompts. |
| Development BeWhere account for preview/test runs | B P140, P177, P185. | No pilot customer credentials in agent tests or preview configuration. Distinguish normal user login from test-run credentials. |

These are the working source/project baseline, not evidence that external services or the new product capabilities are configured.

## Decisions to make

| ID | Question | Proposed default / consequence | Owner and timing |
| --- | --- | --- | --- |
| D-01 | Which single repository is changed by the coding agent? | AutoLoop itself is both orchestrator and demo product. If another repo is chosen, define its language/tests/docs/preview adapter and permission boundary before estimating. Asked during this review; answer pending. | Project owner; before implementation architecture. |
| D-02 | Local or hosted operation? | Resolved: local browser POC, no separate service. The existing Vite runtime forwards model calls and writes the local CSV. | Confirmed by project owner; implemented. |
| D-03 | How does the backend validate a BeWhere session and derive stable user/account identity? | Vite forwards the final salted-hash POST to the existing BeWhere authentication endpoint, derives identity/role from its successful response, and issues an eight-hour HttpOnly session cookie. Browser identity/role claims are not authorization. Restart/expiry requires sign-in; upstream validity/role is not continuously rechecked. | Implemented with synthetic provider tests; live account verification remains. |
| D-04 | Who is product owner/engineer, and which authenticated users receive those app privileges? | Explicit operator allowlist for the experiment; no automatic privilege inheritance from BeWhere role names. Identify user-vs-account ownership and group membership source. | Project owner + engineer; before triage/flag administration. |
| D-05 | What counts as released, to whom, and on which environment? | Shipped means rollout to the agreed pilot/demo audience after human merge, successful deployment, and acceptance of that revision. Production deployment requires human operation; no automatic live customer rollout. | Product owner + engineer; before preview/release implementation. |
| D-06 | Can backend actions replace direct CSV edits, and are the small schema/event/flag additions acceptable? | Use the operator UI/backend as the sole writer; add ownership/link/preview fields and private sidecars described in workflow-and-data.md. This resolves B P078/P101 and enables the documented metrics/gates. | Product owner + engineer; before storage implementation. |
| D-07 | Which current Codex trigger/review mechanism can enforce the documented permissions and scope gate? Is `deepseek-flash` available to the chosen account? | Prove scope drafting separately from approved coding; verify trigger actor/revision, automated review, secret boundary, and cancellation. Do not promise that installing an integration alone enforces these rules. | Engineer; setup/G1 blocker. |
| D-08 | How are duplicate requesters informed and included in preview/release? | Separate request rows reference a canonical ID; backend exposes only customer-safe progress. Product owner explicitly selects every preview participant; duplicate status never grants access automatically. | Product owner; before duplicate and preview acceptance tests. |
| D-09 | What happens on scope rejection, closed PRs, changed scope, and negative preview feedback? | Preserve history; return changed requirements to Scoping and invalidate approval; fix within-scope defects through build/review/preview. Record rejection as Declined with an explicit reason. | Product owner + engineer; before lifecycle implementation. |
| D-10 | How long are transcripts retained, where are backups stored, and how are corrections/deletions handled? | Private directory outside checkout; daily backups and a tested restore. Agree retention rather than inventing a period. | Project owner + engineer; before real records. |
| D-11 | What are the five unset success targets? | Set percentages for triage usability, scope quality, and build quality, plus maximum reviewer minutes and submission-to-preview days. Preserve the fixed targets of ≥3 releases from 5–10 requests and zero unapproved changes. | Product owner + engineer; before first pilot request. |
| D-12 | What request/message limits, spend cap, check owner, and kill-switch procedure apply? | Lightweight configured caps and weekly review; formal purchasing/accounting remains outside the experiment. Prove stopping active/queued work as well as preventing new runs. | Project owner + engineer; before paid pilot runs. |
| D-13 | Which 1–3 pilot customers, sponsor, and weekly team availability? | Use friendly customers and small requests; team members may provide realistic cases. Names/hours were placeholders or parked in the source, not supplied decisions. | Project owner; before pilot launch/sponsor review. |
| D-14 | Which curated docs/features may chat search and what is safe to disclose during duplicate matching? | AutoLoop's approved catalog, initially reflecting only the fresh app. Keep other customers' content hidden; human operator can reconcile duplicates privately. | Product owner; before chat tool implementation. |
| D-15 | What is the first workflow boundary? | Owner selected chat → saved request → ready for Git. Prepare a Markdown issue draft for human review/manual submission; full coding/review/release orchestration is deferred. | Initial capture boundary selected; automatic submission not included. |
| D-16 | What model/persistence runtime serves the POC? | Browser UI/draft recovery, no separate local service. Vite forwards model calls using server-only environment keys and now manages local CSV/session routes. Missing AI configuration is reported rather than simulated. | Implemented; bounded live DeepSeek exchange succeeded. |
| D-17 | How is CSV provided in this POC? | Latest owner request supersedes download-only storage. Confirmed tickets are saved automatically to ignored/private .data/requests.csv by Vite; optional AUTOLOOP_DATA_DIR changes the directory. Full confirmed details/conversation are in a quoted JSON cell, no transcript sidecars. Drafts stay in the browser. Download CSV remains a filtered summary snapshot. Single process per directory, manual backups. | Confirmed by project owner; implemented. |
| D-18 | Who sees and edits locally saved tickets? | Master reads all saved tickets. Administrator and every other admitted role read/save only their own authenticated user/account records. Master views other requesters' tickets read-only. Earlier browser-confirmed records become shared after their owner reconnects and imports them. These rules do not confer future pipeline approval/release privileges. | Owner requested Master/all and Administrator/own; conservative own-only default for other roles. Implemented server-side. |
| D-19 | How can an operator publish a downloaded Git brief? | Run scripts/Publish-GitBrief.ps1 with -BriefPath. Codex reviews local context in read-only mode; gh checks open/closed issues and publishes to tellalli/autoloop. Exact Request IDs return existing URLs, semantic duplicates are reviewed, and missing decisions/errors stop publication. -DryRun prepares output only. Briefs live in .data/gitbrief/ and artifacts in its ignored runs/ subdirectory. No app CSV/status updates or coding trigger are included. | Requested by owner on 2026-11-20; implemented as an operator script, separate from the app. |

D-04 through D-14 remain deferred wherever they require broader API/tool or live-pilot work. D-03 and the limited local writer/visibility boundary are now implemented for the POC. Backups remain manual; no full lifecycle/event/sidecar/approval system is claimed.

## Review assessment

The two documents agree on purpose, the 11 steps, four human decisions, a small CSV-based pilot, and six-week sequencing. The workflow diagram supplies context; the proof-of-concept document supplies the implementation/success constraints. Its milestone image adds the exact phase lengths and three gates that are not fully spelled out in the body text.

The main planning gaps are infrastructure and authority, rather than more product features: a trusted backend, durable single-writer storage, server-validated identity, approval linked to a scope revision, private question/answer relay, selected-user preview after a merge, and metrics beyond simple timestamps. Their proposed treatment is in the other plans, with source-backed requirements separated from implementation recommendations.

The current app's tests/build are a useful frontend foundation; they do not yet prove the backend, provider integrations, repository protections, data isolation, or end-to-end loop. The six-week plan is an experiment target, not a validated estimate from a complete implementation design.
