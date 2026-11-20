# Proof of concept delivery plan

Status: browser ticket-capture MVP implemented; full-flow schedule deferred.
Updated: 2026-11-19.

## Active increment

The owner-selected first MVP is implemented: main-page chat drawer, confirmed request saving, and a Git-ready issue brief. See [mvp-ticket-capture.md](mvp-ticket-capture.md) for its behavior/verification and [capability-catalog.md](capability-catalog.md) for capability explanations. Actual GitHub submission and the automated build/review/release loop remain deferred.

AutoLoop runs locally using the existing React/TypeScript/Vite foundation and BeWhere authentication. Feature changes are restricted to frontend pages/components, styling/assets, browser interactions, accessibility, and relevant frontend tests.

Do not include new or changed product API contracts, backend services, tools, webhooks, hosted environments, or production deployment in requested feature scopes. Supporting POC behavior in the existing Vite runtime now includes model forwarding, the existing BeWhere login exchange/session, and local CSV persistence with role checks. The browser provides optional filtered CSV downloads. Changes to frontend API-client modules still count as product API/integration work when they add service capabilities.

The first frontend slice defines the ticket contract/catalog, then implements the chat drawer and editable summary, save/reopen, and sanitized Markdown handoff. Verify responsive behavior and relevant tests/build. Requests that need excluded product APIs/tools must be narrowed or deferred.

D-16 through D-18 are resolved: browser draft recovery; Vite-managed .data/requests.csv with Master/all and Administrator/own visibility; server environment keys; no separate service or folder setup. Existing browser-confirmed tickets import when their owner reconnects. CSV restart/concurrency/authorization/direct-file denial are tested, and a bounded live DeepSeek conversation succeeded. Real BeWhere role/account sign-in remains to be verified.

The schedule and gates below preserve the source experiment for future planning. They are not current frontend milestones or prerequisites. In particular, backend implementation and live provider validation are no longer the immediate next step.

## Deferred source experiment sequence

The source proposes six weeks, four phases, and three gates. Week 1 starts after its setup questions are answered. Missed gates are fixed before progression; do not skip a gate or silently extend the experiment. Source: B P141–P150 and the [milestone diagram](source-assets/proof-of-concept-scope-image2.png). Source A/B and requirement IDs are defined in [scope.md](scope.md).

## Phase 1: Set up — week 1

Confirm the target repository and runtime (D-01/D-02), identity validation, named operators, release audience, and experiment limits. Retain the current AutoLoop frontend/authentication foundation. Verify live BeWhere login and an independently validated backend identity using the development environment.

Verify DeepSeek Flash access with one backend-mediated test conversation; verify the currently supported Codex scope/build/review setup and the permissions it actually receives. Add repository instructions, required checks, human review protection, a trusted approval trigger, and a tested stop procedure. Use synthetic data only in repository tests. Identify a small candidate request set and configure private storage/backup outside the checkout.

Gate G1: a harmless test issue produces an agent PR with tests and an automated review, while the same build request without authorized scope approval is refused. The agent cannot merge, push main, or deploy. A named engineer can review it. The backend chat/provider test and identity checks work.

## Phase 2: Build the pipeline — weeks 2–3

Deliver in dependency order. This is the largest phase; end-to-end integration and real provider setup are the principal schedule risks.

| Slice | Work | Requirement IDs | Completion evidence |
| --- | --- | --- | --- |
| 1. Private records | Backend authorization, serialized CSV/transcript/event writes, state transitions, backups | S-01, S-04, S-15 | Cross-user denial; restart/concurrent-write/retry tests; restored backup. |
| 2. Request capture | Chat panel, read-only docs/features/duplicate tools, confirmed summary/submission, My requests/detail | S-02, S-03, S-05 | One confirmed chat creates one record; unconfirmed/retried submissions do not create spurious requests; restricted duplicates stay private. |
| 3. Triage and scope | Operator triage, sanitized issue creation, agent scope, question/answer relay, human scope revision approval | S-06, S-07, S-08 | Accept/duplicate/decline paths work; customer answers flow back; no code before valid approval. |
| 4. Build and review | Approved branch work, linked PR, checks, automated first review, human engineer merge | S-09, S-10 | A linked PR has test evidence and human review; forbidden actor/stale approval paths are denied. |
| 5. Synchronization | Signed GitHub webhook, retries/reconciliation, ordering and delivery deduplication | S-11 | Replaying and reordering deliveries cannot skip a gate or create duplicate issues/records. |
| 6. Preview and release | Default-off flags, user/group selection, trusted deployment evidence, preview feedback/acceptance, explicit release | S-12, S-13 | Selected user sees the preview; another user does not; release is impossible before acceptance of the deployed revision. |
| 7. Measurement | Step/decision records, time capture, quality/change-round counters, plain results export | S-14 | One request's lead time, human effort, and complete evidence can be reconstructed. |

Gate G2: one realistic request completes every one of the 11 steps in the agreed environment, including a real scope/build/review cycle, GitHub status delivery, restricted preview, requester acceptance, release, and measurement. Manual starts are acceptable only when logged through the same authorized flow. Validate failure/retry and customer-isolation cases before admitting pilot customers.

If local development cannot receive a webhook, test it using an explicitly configured tunnel or move to the selected hosted backend before G2. A poll-only substitute does not count as verification of the source's webhook integration.

## Phase 3: Run the pilot — weeks 4–5

Use 5–10 real or realistic small requests from 1–3 pilot customers; team members may fill missing requests. Agree metric thresholds before the first pilot submission. Count blocked, merged, declined, abandoned, and failed requests as outcomes rather than hiding them.

For every request capture all four human decisions, reviewer minutes, scope rewrites, PR change rounds, submission/preview/release times, and integration/model costs. Check spend and backups weekly/daily respectively. Improve the slowest step while retaining the same gate rules and tracking any experiment changes.

Gate G3: at least three requests reach Shipped through the complete flow, with no coding-agent implementation before approved scope and with evidence for the other success measures. If the team cannot achieve this, record failure and fix the blocking step rather than claiming the pilot passed.

## Phase 4: Review — week 6

Prepare a leadership demo plus a concise evidence report: request funnel, completed releases, quality percentages with denominators, human effort, lead times, blocked time, cost, incidents, and exceptions. Compare with the thresholds agreed before the pilot. Record sponsor's decision to continue, revise, or stop.

Only then scope follow-on work such as database migration, broader automation, production hardening, and additional products/repositories. Source exclusions remain excluded until deliberately reconsidered.

## Checks that matter

Use focused backend/state-machine tests for ownership, concurrent writes, idempotency, approval revisions, webhook authentication/order, flags, and release gates. Keep frontend tests for confirmed submission, triage permissions, customer questions, and preview acceptance. Add one integrated happy-path exercise spanning all 11 steps, plus negative exercises for unauthorized approval and cross-customer access.

Mock providers in routine tests; use separate, bounded live setup/pilot exercises for BeWhere, DeepSeek, GitHub, Codex, and preview behavior. A green mocked suite alone does not establish that the external pipeline works. No application code or deployment settings were changed during this planning review.

## Deferred full-flow sequence

1. Resolve the demo repository boundary (D-01); local operation (D-02) is confirmed.
2. Verify backend BeWhere identity validation (D-03) and define operator identity/roles (D-04).
3. Confirm the proposed CSV extensions, lifecycle exceptions, preview/release rules, and source reconciliation.
4. Reconsider backend/private-record work only after an explicit expansion beyond the current frontend/API/tool boundary.
