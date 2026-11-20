# MVP: chat to saved request to Git-ready brief

Status: browser capture MVP with local CSV persistence and server-enforced role visibility; live role/account verification remains.
Updated: 2026-11-19.

## Goal and stopping point

Build one useful local path: a logged-in user opens a chatbot from the main page, clarifies a frontend feature request, confirms a structured ticket, saves it, and prepares a human-reviewable GitHub issue draft.

The owner has selected these three deliverables. The automated coding/review/release pipeline from the source documents is deferred. “Ready for Git” means the brief can be reviewed and submitted as an issue; it is not a commit, an approved implementation scope, or permission for an agent to start coding.

Requested product changes remain frontend-only. Existing BeWhere sign-in stays. The owner chose a browser-based POC without a separate local service, with provider keys in server environment variables. The latest instruction adds local CSV ticket storage and Master/Administrator visibility within the existing Vite runtime; it also retains model forwarding. This supporting POC storage does not expand requested feature work into product APIs/tools.

## User experience

1. On `/app`, the floating **Looper** button opens the chat drawer. It resumes the last conversation/existing draft rather than duplicating requests. **New conversation** inside the dialog starts another idea. The drawer is full-screen on smaller screens, manages keyboard focus, and keeps drafts on close/reopen.
2. The assistant greets the logged-in user and asks what they want to accomplish. It asks focused follow-ups about the problem, current and desired behavior, affected screen, data needed, and what success looks like.
3. The assistant consults the curated product capability catalog. It explains what is known to work, what needs a dependency/data-access review, what is outside the frontend boundary, and what is simply unknown. It offers a smaller frontend-only version where possible.
4. A ticket summary is visible for user review/editing: title, problem, expected behavior, included/excluded work, acceptance criteria, dependencies, assumptions, and open questions. The user explicitly confirms submission; conversation alone does not submit anything.
5. After successful server CSV saving, the same request ID is set to Submitted and the dialog advances to Git brief review. Failed saving keeps the user in Ticket. My requests lets a requester reopen their own records. Master sees All tickets, including other users' saved tickets in read-only mode. Refresh tickets loads new submissions.
6. The app prepares a sanitized Markdown issue draft from the confirmed ticket revision, without another generative step. Human review marks it ready for copy/download and manual submission. Unknown dependencies and scope assessment stay visible. Actual issue creation, Git credentials, and status sync remain outside this slice. See [Looper workflow](looper-workflow.md) for the detailed contract.

Do not show implementation details or raw library names unless they help the user choose. For example, say “Displaying known locations is possible; address lookup needs a service we have not approved” rather than requiring the user to select a map engine.

## Capture contract

| Information | How it is obtained |
| --- | --- |
| Request ID, timestamps, owner user/account IDs | Browser creates opaque IDs; server confirms owner from BeWhere authentication, stamps updates, and enforces user/account ownership. No tokens/passwords are copied into request metadata. |
| Title and problem/use case | Assistant drafts; user confirms. |
| Current behavior and desired behavior | Conversation; explicitly mark unknown facts. |
| Affected screen and intended audience | User's description plus known product context. |
| Included frontend behavior and exclusions | Derived from the confirmed request and current frontend-only policy. |
| Observable acceptance criteria | Short, testable examples confirmed by the user. |
| Data needed | Required fields, source, freshness, and known access restrictions; do not invent endpoint support. |
| Dependencies and capability evidence | Catalog entry IDs/version; installed/approved/unknown state and any missing library/provider/data. |
| Assumptions and unanswered questions | Kept separate from confirmed facts. |
| Transcript reference and confirmation time | Private storage, not included in the Git-ready export. |

Keep the source CSV fields defined in [workflow-and-data.md](workflow-and-data.md). The working CSV appends owner_user_id, owner_account_id, updated_at, revision, handoff, and request_json. The JSON cell retains the full confirmed ticket/conversation for reopening. Browser storage preserves drafts and caches only the current user's records. Optional Download CSV remains a summary export without transcripts or recovery JSON.

## Status and handoff

Retain the source request lifecycle: Draft while clarifying; Submitted only after user confirmation and a successful CSV save. Track handoff separately as `needs_review` or `ready_for_git`; open questions stay in the ticket. “Ready for Git” does not replace Accepted/Approved.

A ticket may be Submitted while a map provider or API capability still needs review. It can also become ready for an issue when its intent is clear and a human has reviewed the explicitly recorded technical questions; issue scoping is where those questions can be resolved. Readiness does not require the customer to solve the implementation. If the request definitely requires excluded API/tool work, narrow it or keep it marked for scope review. The assistant cannot self-approve implementation scope or guarantee feasibility.

Preparing an export does not create an issue. Actual future issue submission must follow the source's human triage/acceptance step. A manual issue-URL field can be a later addition; it is not required for this MVP.

The Markdown issue draft contains the opaque request ID, confirmed functional brief, frontend boundary, acceptance criteria, dependencies, and remaining explicitly deferred questions. Exclude customer identity, private transcript, credentials, and unrelated customer data. Changing the confirmed brief creates a new revision and resets handoff readiness until reviewed again.

## Selected runtime and local files

The owner rejected a separate local service. Capture, draft recovery, handoff review, and export run in the browser. The existing Vite server forwards `/__autoloop/chat` to DeepSeek with server-only `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, and `DEEPSEEK_BASE_URL`. It now also authenticates the final BeWhere hash exchange and reads/writes the local CSV. There are no agent tools or GitHub credentials.

The forwarder validates the structured response and supplies a fixed capability catalog/policy; it has no tools. Without configuration or on a provider error, the conversation is retained and the user can retry or edit the ticket manually. It does not simulate a successful model response. Current provider endpoint/JSON format were checked against the [official chat API](https://api-docs.deepseek.com/api/create-chat-completion) and [JSON output guidance](https://api-docs.deepseek.com/guides/json_mode/); live calls still need a key.

Browser recovery uses its own versioned account/user storage key. `/__autoloop/authenticate` derives identity and role from the successful BeWhere response and issues an HttpOnly, SameSite cookie backed by an eight-hour in-memory session. `/__autoloop/requests` requires this session. Master (role 7) reads all saved tickets; Administrator (role 5) and all other admitted roles read/save their own only. Master cannot write another requester's ticket. Posted/browser role claims cannot grant access. Restart/expiry requires sign-in again; upstream roles are refreshed on sign-in, not continuously polled.

The latest owner request supersedes the earlier download-only choice: confirmed tickets and handoff changes now persist automatically to `.data/requests.csv`, created on first save. Optional `AUTOLOOP_DATA_DIR` selects another private directory. Existing browser-confirmed tickets are imported once when their owner next connects with a valid server session. Drafts remain browser-local. No folder picker or filesystem permission UI is required.

The CSV writer serializes changes within one process, quotes multiline content, guards spreadsheet formulas, and replaces the file using a temporary file. Invalid CSV is kept unchanged and blocks saves. The directory is ignored by Git and denied from direct Vite serving, including raw imports. Run one process per CSV directory and back it up manually; cross-machine synchronization and automated backups remain deferred. Download CSV is a filtered summary snapshot, separate from the working storage file. Git-ready Markdown export remains unchanged.

## Delivery order

| Slice | Deliverable | Exit condition |
| --- | --- | --- |
| 1. Ticket contract and catalog | Confirm fields, baseline capabilities, and representative frontend requests. | Known support and unknown dependencies are explicit; no invented API behavior. |
| 2. Chat drawer and summary | Main-page launcher, accessible responsive panel, conversation, editable summary, explicit confirmation. | User can close/reopen, revise, and confirm a coherent frontend ticket. Provider behavior follows the selected runtime. |
| 3. Save and reopen | Chosen persistence path, request IDs, transcript/details, My requests. | Reload/restart preserves the confirmed record as appropriate; retries do not duplicate it; save failure is recoverable. |
| 4. Git-ready brief | Human review state, sanitized Markdown preview/copy/download. | A reviewer can create a GitHub issue without reinterpreting the conversation; no issue is created automatically. |

Evaluate a few small representative requests throughout, including one simple UI change, a map request with missing location data/provider, and a request requiring a new API. The third must be narrowed or marked outside scope, not silently accepted as frontend work. Record newly discovered gaps and revise the catalog/plan without expanding the MVP into the full pipeline.

## Focused acceptance checks

- Signed-out users cannot open the capture workspace; the existing sign-in flow remains intact.
- A draft is retained when closing/reopening the chat; confirmation is explicit and revisable.
- The summary distinguishes confirmed facts, assumptions, unknown capabilities, and excluded work.
- Unsupported API/tool work is flagged with an honest alternative; unknown support is not presented as either verified support or definite impossibility.
- Drafts have stable IDs. Submitted status is set only on a successful CSV save; duplicate clicks/retries do not duplicate a request; saved details reopen after restart.
- Master sees all saved tickets, other roles only their own user/account records; anonymous access, forged ownership/roles, and direct CSV downloads are denied.
- The issue draft contains no private transcript, customer identity, or authentication secrets.
- No GitHub write, code generation, branch creation, automatic approval, preview rollout, or production release is part of this MVP.

## Verification and remaining setup

The implementation is checked with authentication/capture/model-forwarding/browser-storage/export tests and a production build. CSV tests cover restart recovery, concurrent writes, role filtering, forged writes, stale changes, and corrupt-file preservation. An HTTP test uses a real local Vite server with synthetic BeWhere authentication to verify save/list/logout and direct-file blocking. Earlier Chrome checks covered native dialog, confirmation, Markdown/CSV download, and desktop/mobile layouts. A synthetic welcome/full-name exchange succeeded against live DeepSeek. Real BeWhere Master/Administrator logins remain unverified by this work.

Restart Vite and sign in again to establish the new local session. Confirm a ticket to create the working CSV; use Download CSV for an optional filtered snapshot. Automatic GitHub submission and the wider development pipeline remain later increments.
