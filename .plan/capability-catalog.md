# Capability catalog proposal

Status: capability context implemented in `src/features/requests/capabilities.ts`; updated 2026-11-19.

## Why the chatbot needs this

The chatbot should explain the product's abilities in plain language using maintained evidence. A login to `api.bewhere.com` does not reveal every API capability or establish access to every endpoint. Model general knowledge is not evidence that a feature is available to this app or user.

Start with a small engineer-maintained file, not automatic API discovery, a vector database, or a new tool system. Give the request assistant a safe product-facing subset as context. Refresh the catalog when dependencies, endpoint contracts, or scope policies change; record the catalog revision on the ticket.

The current catalog is supplied directly in the server-controlled chat prompt. Ticket records and Git briefs retain its version. The model has no tool execution capabilities and cannot turn its response into submission, approval, or handoff readiness; those are explicit browser actions.

Catalog revision `2026-11-19.1` explicitly documents `useAuth().user` and AuthUser.name, username, email, role, and account identifiers. The name comes from the login response's `user.name`, with the existing username fallback. This source mapping is known from code; it does not guarantee that every account provides a full name or grant access to other API data. No actual profile values or auth tokens are added to the model prompt. A successful new chat turn records the current catalog version on the draft.

## Separate platform capabilities from requested product capabilities

| Category | Examples | Who manages it |
| --- | --- | --- |
| AutoLoop internal capabilities | Request conversation, persistence, issue-draft preparation; later agent orchestration | AutoLoop developers; controlled service configuration, with secrets outside user-visible context. |
| Product frontend capabilities | React pages, forms, tables, filters, chart/map rendering, accessibility patterns | Shared app dependencies/components and an approved capability catalog. |
| Product data/service capabilities | Existing endpoint fields, read/write permissions, tile/geocoding/routing services | Engineers verify contracts, access, approved usage, and environment. |

Do not install a separate set of libraries for each requester. Users describe what they need; developers maintain the shared application dependencies. A user may suggest a library, but it remains a proposal until reviewed. Cataloging a library does not install it or approve an external service.

## Entry fields

Use a stable capability ID, user-facing name/description, category, evidence, review date/version, frontend-only eligibility, data requirements, permission/environment restrictions, dependency status, and known limitations. Never store tokens or private customer records in the catalog.

Keep these dimensions distinct:

- Availability: `verified`, `candidate`, `unknown`, or `unavailable`.
- Policy: `allowed`, `needs_review`, or `out_of_scope`.
- Data/access: `verified`, `unknown`, or `denied` for the relevant environment/user.

A candidate library can be technically suitable while still needing approval; a verified endpoint can still be inaccessible to a particular user. The assistant should never collapse those cases into an unconditional “yes.” UI explanations can simply say “Available,” “Needs review,” “Not available yet,” or “Outside the current scope.”

## Initial inventory

| ID | Capability | Evidence | Initial position |
| --- | --- | --- | --- |
| AUTH-01 | BeWhere username/password sign-in and local session | `src/api/auth.ts`, auth provider/guard, mocked tests | Implemented; live account sign-in remains unverified. No inference about other API access. |
| UI-01 | React frontend pages/components | `package.json`, current pages | Installed foundation; new frontend interactions fit the scope. |
| UI-02 | Client navigation and icons | `react-router-dom`, `lucide-react` in package.json | Installed. No external-service capability implied. |
| DATA-01 | Read asset locations from BeWhere | No asset/location endpoint or contract implemented in AutoLoop | Unknown; requires documented fields and access evidence. Do not infer from the old project or from login. |
| MAP-01 | Render an interactive map | No mapping library in current package.json | Candidate, not installed/approved. A reviewed frontend library could supply rendering. |
| MAP-02 | Load a basemap | No tile/style provider configured | Needs review; renderer and map imagery are distinct dependencies. Local app execution does not make provider access offline. |
| MAP-03 | Turn addresses into coordinates or calculate routes | No service configured | Unknown/unapproved; separate from rendering markers with known coordinates. |
| API-NEW | Create/change a product API | Explicit current project boundary | Out of scope. Record/narrow/defer requests that require this. |
| TOOL-NEW | Build new agent/user tools or connectors | Explicit current project boundary | Out of scope; not required just to supply the catalog as model context. |

## Map request example

For “show my assets on a map,” ask which records, where their coordinates come from, whether updates are live or manual, and which interactions matter. A typical ticket might ask for markers, a detail popup, filters, and an empty/error state.

Classify the dependencies separately:

1. Map rendering library: frontend dependency, subject to review.
2. Asset latitude/longitude and labels: existing data contract/access must be verified; synthetic coordinates are an explicit prototype alternative, never a claim of live tracking.
3. Basemap tiles/style: approved provider or explicit local assets; may involve external requests, credentials, usage terms, and cost.
4. Geocoding/routing/live tracking: additional capabilities, not automatically included by choosing a map library.

The assistant can then say: “We can scope the map screen. The location data and map background still need verification; no new API will be built in this phase.” It may propose a narrower prototype if the user agrees. A human can review those technical questions for inclusion in the issue; Git-ready is readiness for issue submission, not verified implementation feasibility.

Leaflet is an example candidate renderer, not a selected dependency. Its official overview distinguishes map layers and markers from the tile source: [Leaflet](https://leafletjs.com/). If OpenStreetMap standard tiles are considered, their service has attribution/usage requirements and does not allow offline tile downloading: [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). Provider selection is a separate decision; no mapping package or provider is approved by this plan.
