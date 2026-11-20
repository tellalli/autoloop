# Extracted source: AutoLoop proof of concept scope

Source: `../AutoLoop proof of concept scope.docx`.

Extracted from the Word document on 2026-11-18. Paragraph IDs are for planning references. Consult the original document and its extracted diagram for layout and visual details.

[P001] AutoLoop: proof of concept scope

[P002] Nov 18, 2026 · @Alban

[P003] Summary

[P004] In six weeks we extend our existing Lite portal so a customer can ask for a feature in a chat, and an AI agent turns the approved request into a released change, with people deciding at four points.

[P005] The proof of concept tests one question: can AI do the conversation, the scoping and the coding well enough that our team only makes decisions and reviews? It runs on one repository, with 5 to 10 real or realistic requests, and stores requests in a CSV file instead of a database.

[P006] The result is a working demo we can show to senior leadership, plus measured numbers on speed, quality and reviewer effort.

[P007] Objectives and success criteria

[P008] The proof of concept succeeds if at least 3 customer requests go from chat to release through the full flow, with no step done outside it.

[P009] Objective

[P010] Success criterion

[P011] Target

[P012] Prove the flow works end to end

[P013] Requests released through all 11 steps

[P014] At least 3 of 5–10

[P015] Show the chat captures a usable request

[P016] Requests accepted at triage without going back to the customer

[P017] [__ %]

[P018] Show the agent scopes well

[P019] Scopes approved without a rewrite

[P020] [__ %]

[P021] Show the agent builds well

[P022] Pull requests merged with at most one round of changes

[P023] [__ %]

[P024] Keep human effort low

[P025] Reviewer time per request, all four decisions together

[P026] Under [__] min

[P027] Make it fast

[P028] Time from submission to customer preview

[P029] Under [__] days

[P030] Keep it safe

[P031] Code changed without an approved scope

[P032] Zero

[P033] Targets in brackets are set with the team before the first request.

[P034] In scope and out of scope

[P035] The proof of concept builds the smallest version of every step, and leaves out anything only needed at scale.

[P036] In scope

[P037] Our existing Lite portal (Bootstrap front end, data from api.bewhere.com), with a chat assistant added

[P038] A chat assistant that clarifies a request, suggests existing features and records a confirmed summary

[P039] A CSV request log with fixed statuses, written only by the app backend

[P040] A simple triage view, or a manual triage step on the CSV

[P041] Creating a GitHub issue for each accepted request

[P042] A coding agent that drafts the scope, then builds on a branch after approval

[P043] Pull requests with tests, reviewed and merged by an engineer

[P044] A feature flag so the requesting customer sees the change first

[P045] Status shown back to the customer in the app

[P046] Measuring the numbers in the success criteria

[P047] Out of scope

[P048] A production database (the CSV stands in for it)

[P049] Automatic triggers between every step (we start them by hand where faster)

[P050] More than one repository or product

[P051] Automatic deployment to production without a person

[P052] Billing, pricing or customer contracts for requested features

[P053] A voting board or plugin marketplace (listed as later options)

[P054] The Lite portal and the flow

[P055] The demo runs in our existing Lite portal, with a chat panel and a “My requests” page added; every customer request moves through the same 11 steps.

[P056] Proof of concept flow · 11 steps, 4 decisions by people

[P057] Steps 1 to 3 and 10 to 11 happen in the app; steps 4 to 9 happen in the GitHub repository, where the agent works. Questions in the scope about what the customer meant go back to them through the chat.

[P058] Components to build

[P059] Seven components, most of them small; the chat assistant and the agent setup carry most of the work.

[P060] Component

[P061] What it does

[P062] Built with

[P063] Size

[P064] Lite portal

[P065] Our existing portal; we add a chat panel and a “My requests” page

[P066] Existing Bootstrap front end; data from api.bewhere.com

[P067] Small

[P068] Chat assistant

[P069] Asks follow-up questions, suggests existing features, shows a summary for the customer to confirm

[P070] DeepSeek Flash (deepseek-flash) through the DeepSeek API, with read-only tools: search product docs, list features, check the request log for duplicates

[P071] Medium

[P072] Request log

[P073] Stores each request and its status

[P074] A CSV file plus one transcript file per request, written by the backend

[P075] Small

[P076] Triage

[P077] A person accepts, merges or declines each request

[P078] Editing the CSV status by hand, or a simple admin page

[P079] Small

[P080] GitHub integration

[P081] Creates the issue for an accepted request and updates the CSV when labels change or a PR merges

[P082] GitHub API from the backend, plus a webhook

[P083] Small

[P084] Coding agent

[P085] Posts a scope and questions on the issue; after the approved label, builds on a branch and opens a PR; then posts an automated first review on the PR

[P086] OpenAI Codex, connected through its GitHub integration (or the Codex GitHub Action), triggered by the approved label; Codex code review on every PR

[P087] Medium

[P088] Preview and release

[P089] Shows the change to the users we choose first, then to everyone

[P090] A feature flag per user or user group, set in the Lite portal by the product owner

[P091] Small

[P092] What the chat assistant can and cannot do

[P093] Can: ask questions, read product docs, list existing features, find similar requests, write a request after the customer confirms

[P094] Cannot: read or change code, promise that something will be built, give dates, change any customer data

[P095] Data: the request log

[P096] One CSV file, requests.csv, holds one row per request; its columns match the database table we build later, so moving over is a straight import.

[P097] request_id,created_at,customer_id,customer_name,summary,status,github_issue,transcript_file,submitted_at,triaged_at,approved_at,merged_at,shipped_at,notes
REQ-0001,2026-11-18T10:12:00Z,381,Acme Ltd,"Export invoices to PDF from the billing page",Submitted,,transcripts/REQ-0001.md,2026-11-18T10:20:00Z,,,,,

[P098] Statuses, in order: Draft → Submitted → Accepted (or Merged into another request, or Declined) → Scoping → Approved → Building → In review → Preview → Shipped.

[P099] Rules

[P100] Each chat transcript is its own file; the CSV holds only its path.

[P101] Only the app backend writes rows. People change statuses by hand during the proof of concept.

[P102] The timestamp columns give us the speed measures without extra tracking.

[P103] The CSV and transcripts stay outside the code repository, so the coding agent never sees customer data. Back them up daily.

[P104] Roles and decisions

[P105] Four decisions stay with people; in the proof of concept one product owner and one engineer can cover all of them.

[P106] Decision

[P107] When

[P108] Who

[P109] Options

[P110] Triage

[P111] After the customer submits

[P112] Product owner [name]

[P113] Accept, merge with a duplicate, decline

[P114] Scope approval

[P115] After the agent posts its scope

[P116] Product owner [name], with the engineer for technical points

[P117] Approve (add the label), ask for changes, reject

[P118] Code review

[P119] After the agent opens a pull request

[P120] Codex posts an automated review first; Engineer [name] decides and merges

[P121] Merge, request changes, close

[P122] Customer preview

[P123] After the merge, behind a flag

[P124] The requesting customer and any other users the product owner turns the flag on for

[P125] Confirm, or report what is missing

[P126] Codex reviews code that Codex wrote, so its review is a first pass that catches obvious problems; the engineer’s review and merge stay the real gate.

[P127] Other roles

[P128] Pilot customers: 1 to 3 friendly customers [names] who submit real requests and try the previews.

[P129] Sponsor: [name] from the senior team, who reviews the results at the end.

[P130] Security and guardrails

[P131] The core rule: customers never talk to the agent that can change code, and only a label added by a person starts a build.

[P132] Untrusted input: customer chat text is treated as data. It reaches the coding agent only inside an issue a person has accepted, never as an instruction that starts work.

[P133] Agent permissions: the coding agent can read the repository, push to its own branches and open pull requests. It cannot merge, push to the main branch, deploy, or read secrets beyond what tests need.

[P134] Branch protection: the main branch requires an approved review and passing tests.

[P135] Chat assistant limits: read-only tools only; no access to code, other customers’ data or admin actions.

[P136] Customer data: the CSV and transcripts live outside the repository and are not shared with the coding agent.

[P137] Abuse limits: at most [__] requests per customer per week, and a length limit on chat messages.

[P138] Spend limits: a monthly cap on model and CI costs, checked weekly.

[P139] Kill switch: removing the agent’s workflow file or token stops all agent activity at once.

[P140] API credentials: previews and the agent’s test runs use the development account on api.bewhere.com, never a customer’s credentials. API keys stay out of the repository and out of the agent’s reach.

[P141] Plan and milestones

[P142] The proof of concept runs for six weeks in four phases; each phase ends at a gate the team checks before moving on.

[P143] Proof of concept plan · 4 phases, 3 gates

[P144] Week 1 starts once the open questions below are answered. If a gate is missed, we fix that step before starting the next phase rather than extending the pilot.

[P145] First week checklist

[P146] ☐ Choose the repository and confirm it has good tests

[P147] ☐ Name the product owner, engineer and pilot customers

[P148] ☐ Agree the targets in the success criteria

[P149] ☐ Connect Codex to the repository, turn on Codex code review, and set branch protection

[P150] ☐ Create a test issue and check Codex opens a pull request; send a test chat to DeepSeek Flash

[P151] Risks, assumptions and open questions

[P152] The biggest risk is that the agent’s work needs so much rework that review costs more than building it ourselves; the measures above will show this early.

[P153] Risks

[P154] Risk

[P155] Effect

[P156] Mitigation

[P157] Agent output needs heavy rework

[P158] Reviewer time exceeds the target

[P159] Keep requests small; split large scopes at approval; improve repository instructions and tests

[P160] Chat assistant promises too much

[P161] Customer expects a feature we decline

[P162] Fixed wording: it never commits or gives dates; summary says a person decides

[P163] Too few real requests

[P164] Not enough data to judge

[P165] Team members play customers for the remaining requests

[P166] Weak tests in the chosen repository

[P167] Agent changes break things unnoticed

[P168] Pick a repository with good tests; require tests in every PR

[P169] Prompt injection through chat text

[P170] Agent does something unintended

[P171] Human triage and the approved label stand between chat and code

[P172] Costs grow faster than expected

[P173] Budget overrun

[P174] Monthly spend cap, checked weekly

[P175] Assumptions

[P176] The code is on GitHub, and we can add an agent workflow and a webhook.

[P177] The Lite portal can run in a preview environment against the development account on api.bewhere.com.

[P178] One product owner and one engineer can spend about [__] hours a week on it.

[P179] Open questions

[P180] ☒ Demo app: start from the existing Lite portal (decided)

[P181] ☒ Tech stack: the Lite portal’s Bootstrap front end, with data from api.bewhere.com (decided)

[P182] ☒ Coding and review agent: OpenAI Codex; chat assistant: DeepSeek Flash (decided)

[P183] ☒ Who sees a preview: the product owner chooses users per feature flag (decided)

[P184] ☒ Sending customer chat text to the DeepSeek API: acceptable (decided)

[P185] ☒ Test account: the development account on api.bewhere.com (decided)

[P186] ☒ Accounts and spend: not formalised during the experiment (decided)

[P187] ☐ Is the Lite portal’s code on GitHub, and does it have automated tests?

[P188] ☐ Which 1 to 3 pilot customers? (parked for now)

[P189] ☐ What are the targets for the success criteria? (parked for now)

[P190] ☐ Who sponsors the review at the end? (parked for now)
