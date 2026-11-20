export const CATALOG_VERSION = '2026-11-19.1';
export const CAPABILITY_CONTEXT = `Verified project context (catalog ${CATALOG_VERSION}):
- AutoLoop is a fresh React/TypeScript/Vite frontend with react-router-dom and lucide-react.
- BeWhere username/password authentication is implemented; live account access and other endpoints have not been verified.
- AuthUser is already available through useAuth().user. Its implemented fields are id, username, name, email, role, accountId, and accountName. The auth token is private and must never be included in a feature brief or sent to this assistant.
- The login adapter sets AuthUser.name from the login response's user.name, falling back to username if absent. The main page already displays this name. A full-name greeting can use useAuth().user.name with that existing fallback; it does not need a new endpoint or a mock placeholder. Do not guarantee an account supplies a full name if it does not.
- Other API fields, device/asset/location endpoints, and the logged-in user's data permissions are UNKNOWN. Login is not proof of access.
- No mapping/charting library or map tile/geocoding/routing provider is installed/configured. These are candidates needing review, not available capabilities.
- Frontend pages, forms, styling, filters, accessibility, and browser interactions are within the requested feature boundary.
- New/changed product APIs, backend services, agent tools, or integrations are OUT OF SCOPE. Existing verified services may be consumed only within their documented capability and access.
- A map renderer, coordinate data source, basemap provider, and geocoding/routing are separate dependencies. Ask which are needed. Do not promise live tracking or invent data/endpoints.
- Users request outcomes. Shared frontend dependencies are developer-managed, not installed separately per requester.
- The app captures tickets. It does not create GitHub issues, change code, approve scopes, run agents, or release features.`;
