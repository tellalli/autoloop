import { isObject } from '../src/features/requests/model';
import { CsvTicketStore, StoreError } from './csv-store';
import { authenticate, SessionStore } from './sessions';

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

export function ticketHandlers(store: CsvTicketStore, sessions: SessionStore, apiBase: string) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get('Origin');
    if (origin && origin !== new URL(request.url).origin) return json({ error: 'Origin not allowed.' }, 403);
    const path = new URL(request.url).pathname;
    if (path === '/__autoloop/authenticate' && request.method === 'POST') return authenticate(request, sessions, apiBase);
    if (path === '/__autoloop/session' && request.method === 'DELETE') {
      return json({ signedOut: true }, 200, { 'Set-Cookie': sessions.revoke(request) });
    }
    const identity = sessions.get(request);
    if (!identity) return json({ error: 'Sign in again to access the local ticket store.' }, 401);
    if (path !== '/__autoloop/requests') return json({ error: 'Not found.' }, 404);
    try {
      if (request.method === 'GET') {
        return json({ viewer: identity, requests: await store.list(identity) });
      }
      if (request.method === 'POST') {
        if (!request.headers.get('Content-Type')?.includes('application/json')) return json({ error: 'Expected JSON.' }, 415);
        let input: unknown;
        try { input = await request.json(); } catch { return json({ error: 'Invalid ticket request.' }, 400); }
        return json({ request: await store.save(isObject(input) ? input.request : null, identity) });
      }
      return json({ error: 'Method not allowed.' }, 405);
    } catch (error) {
      return error instanceof StoreError ? json({ error: error.message }, error.status)
        : json({ error: 'The local ticket store is unavailable. Please retry.' }, 503);
    }
  };
}
