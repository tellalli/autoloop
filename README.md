# autoloop
AutoLoop: from customer request to release

Turn a customer request into a released feature, with people deciding what gets built and what ships.

## Planning

All project planning belongs in [`.plan/`](.plan/README.md), including implementation plans, design notes, research, open questions, and decisions.

## Getting started

Requires Node.js 22.12+ (Node.js 24 recommended) and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Authentication defaults to `https://api.bewhere.com`; no environment file or shared API key is required. Sign in with your existing BeWhere credentials.

The floating **Looper** button opens chat from the main page and resumes your conversation. Use **New conversation** inside the dialog for another idea. Review/edit the **Ticket**, then **Confirm and save request** to advance to **Git brief** review. Mark it ready after human review, then copy or download the Markdown issue draft. It does not create a GitHub issue or start a build. The [Looper workflow](.plan/looper-workflow.md) describes each handoff and what the brief contains.

For live AI chat, copy `.env.example` to `.env.local` and set the server-only `DEEPSEEK_API_KEY`. `DEEPSEEK_MODEL` defaults to `deepseek-flash`; `DEEPSEEK_BASE_URL` defaults to `https://api.deepseek.com`. Restart Vite after configuration changes. The existing Vite server forwards AI calls at `/__autoloop/chat`; no separate service is required. Keys are never sent to browser code or included in the built frontend. Without a key, manual ticket editing/saving/export works and chat reports that it is not configured.

Looper preserves the current ticket when DeepSeek returns a partial update and converts text lists to multiline ticket fields. Unusable model output receives one bounded format-repair attempt. Connection, TLS, timeout, authentication, balance/rate-limit, and response-format errors have distinct codes/messages; rejected output never changes the saved draft. Diagnostics log only safe codes, not conversations, raw responses, or credentials.

To use a different BeWhere environment, copy `.env.example` to `.env.local`, set `VITE_API_BASE_URL`, and restart Vite. This is public, build-time browser configuration; never add passwords, tokens, or private keys to `VITE_` variables.

```sh
npm test
npm run build
npm run preview
```

## Bootstrap scope

Adapted from `atagforbusiness` using the same React 19, TypeScript, and Vite stack, the public/sign-in page structure, its decorative `public/background.svg`, and the BeWhere authentication protocol. AutoLoop has its own branding and a browser-based ticket-capture workspace.

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | AutoLoop landing page |
| `/login` | Public | BeWhere username/password sign-in |
| `/app` | Signed in | Request chat, My requests, local saves, and Git-ready briefs |

There are no imported business features, dashboards, maps, customer records, secrets, or source-project environment/deployment files. Requests start empty; test/browser-QA records are synthetic. BeWhere identity/session and the requests you create use separate browser storage keys.

## Publishing a downloaded Git brief

Use PowerShell 7.2+, authenticated Codex CLI, and GitHub CLI with access to `tellalli/autoloop`:

```powershell
.\scripts\Publish-GitBrief.ps1 -BriefPath '.\.data\gitbrief\REQ-566F1BEBDA7A.md'
# Review and prepare the issue without publishing:
.\scripts\Publish-GitBrief.ps1 -BriefPath '.\.data\gitbrief\REQ-566F1BEBDA7A.md' -DryRun
```

The script reviews the brief against project code/docs using `codex exec` in its read-only sandbox, checks all open/closed GitHub issues using paginated `gh api`, then publishes with `gh issue create` and returns its URL. The repository defaults to `tellalli/autoloop`; override with `-Repository owner/repo`. It also finds the standard Windows GitHub CLI installation when `gh` is missing from PATH.

Request ID matches return the existing URL without editing or reopening the issue, with a warning for a different revision. Codex also checks similar feature requests. Authentication/lookup/review failures or blocking questions stop publication. A final duplicate check detects changes during review; concurrent runs for the same Request ID in this checkout share a lock. GitHub creation is not a distributed transaction across different computers/checkouts.

Keep downloaded briefs in `.data/gitbrief/`. The input stays unchanged. Review JSON, prepared Markdown, CLI logs, and result receipts are saved under ignored `.data/gitbrief/runs/`, blocked from direct Vite web access. `-DryRun` still needs GitHub read access and runs a Codex review. Failed create commands are not automatically retried because the remote outcome may be uncertain. Issue creation does not authorize implementation, change ticket status, or update the app's CSV.

Brief paths are relative to your current working directory. From the project root, use `.\.data\gitbrief\...` for a file inside this project's `.data`; `..\.data\gitbrief\...` refers to `.data` in the parent directory. Sign in using `gh auth login -h github.com` (or its full executable path) and `codex login` if needed.

## Where requests are saved

Confirmed tickets are automatically saved to `.data/requests.csv` under the AutoLoop project. The existing Vite server manages this file; no separate service or folder picker is needed. The file is created on the first confirmed save, survives server restarts, is ignored by Git, and is blocked from direct web access. Optionally set the server-only `AUTOLOOP_DATA_DIR` to another private directory.

**Master** users see all saved tickets. **Administrator** users and other admitted roles see only their own tickets, matched by authenticated user and account. These checks run on the server using the BeWhere login response. Masters can inspect other users' tickets but cannot edit them. Use **Refresh tickets** to load new submissions.

The working CSV retains the original scope columns and adds owner IDs, update/revision/handoff fields, and a quoted `request_json` column containing the full confirmed ticket and conversation for reopening. No separate transcript file is created. Authentication credentials are not copied into ticket metadata. Keep this file private and make manual backups; do not edit it while AutoLoop is running. Run only one AutoLoop process against a given CSV directory.

Unconfirmed drafts and unsent messages remain in account/user-specific browser storage. Confirmed tickets previously saved only in this browser are imported into the CSV when their owner next signs in successfully; Masters see those older records after their owners sync. Clearing browser storage removes unsaved drafts, while confirmed CSV tickets remain available to logins using the same AutoLoop server and data directory. Different computers or independent server directories do not synchronize.

**Download CSV** remains available as a filtered summary snapshot: Master downloads all visible confirmed tickets; other users download their own. This download uses the original summary columns and excludes full conversations and recovery JSON. It does not update the working CSV when edited.

The assistant uses the small catalog in `src/features/requests/capabilities.ts`. It distinguishes known frontend support from unknown API/data access and unapproved map libraries/services. It cannot approve scope, access tools, create issues, or change code. Git briefs exclude account metadata and transcripts and redact known identity/token strings; review any remaining user-entered private content before sharing.

## Authentication

`src/api/auth.ts` implements the same handshake as the source project:

1. `GET /authentication/{encodedUsername}/?type=WEB` retrieves a salt and initial token.
2. The browser computes `SHA256(salt + SHA256(password))` as lowercase hexadecimal.
3. The browser posts the hash and initial token to `/__autoloop/authenticate`. Vite forwards `authphrase`, `username`, `tidHashAlgorithm: "2"`, and `tidSession: "3"` to BeWhere's `POST /authentication`.

The original password is never persisted or sent to either server. The same API role allowlist is retained: Installer, Driver, User, Manager, Supervisor, Integrator, Administrator, Dealer, and Master. No Access and System roles are denied. The server derives ticket ownership and role from BeWhere's response, never from posted role or customer claims.

The browser session remains under `autoloop_auth_user_v1`. Successful authentication also creates an eight-hour local server session through an HttpOnly, SameSite cookie. Sign-out revokes that local session and clears browser login state; it does not revoke the upstream BeWhere token. Existing browser-only logins, server restarts, and session expiry require signing in again. Role changes take effect on the next sign-in or expiry.

The `/app` guard controls navigation; `/__autoloop/requests` independently enforces server session and ownership checks. This local POC does not continuously revalidate the upstream token. The salt request still needs BeWhere CORS access. Localhost supports the browser's secure hashing API; production hosting is outside this increment.

Tests verify authentication, capture/confirmation/handoff, draft recovery, CSV round trips/restarts/concurrent submissions, role filtering, denied writes, corrupted-file preservation, and direct-file blocking through a real local Vite server. BeWhere responses are synthetic; live Master/Administrator logins still need account verification. Routine tests do not make paid model calls.

## Deployment

The POC runs locally with `npm run dev`, or `npm run build` then `npm run preview`. Both Vite modes include AI forwarding, authenticated ticket routes, and the local CSV writer. A static-only host cannot provide those capabilities without a server adapter, which is outside this POC. No hosting project is linked and no deployment has been created.
