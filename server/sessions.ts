import { randomBytes } from 'node:crypto';
import { API_ROLE_NAMES } from '../src/auth/apiRoles';
import type { Role } from '../src/auth/auth.types';
import { isObject, type RequestOwner } from '../src/features/requests/model';

export interface TicketIdentity { owner: RequestOwner; role: Role }
const COOKIE = 'autoloop_session';
const MAX_AGE = 8 * 60 * 60;

export class SessionStore {
  private sessions = new Map<string, { identity: TicketIdentity; expires: number }>();

  issue(identity: TicketIdentity): string {
    for (const [key, value] of this.sessions) if (value.expires <= Date.now()) this.sessions.delete(key);
    const id = randomBytes(32).toString('base64url');
    this.sessions.set(id, { identity, expires: Date.now() + MAX_AGE * 1000 });
    return `${COOKIE}=${id}; HttpOnly; SameSite=Strict; Path=/__autoloop; Max-Age=${MAX_AGE}`;
  }

  get(request: Request): TicketIdentity | null {
    const session = this.sessions.get(this.id(request));
    return session && session.expires > Date.now() ? session.identity : null;
  }

  revoke(request: Request): string {
    this.sessions.delete(this.id(request));
    return `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/__autoloop; Max-Age=0`;
  }

  private id(request: Request): string {
    return request.headers.get('Cookie')?.split(';').map((part) => part.trim())
      .find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) || '';
  }
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

export async function authenticate(
  request: Request, sessions: SessionStore, apiBase: string,
): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ message: 'Invalid authentication request.' }, { status: 400 }); }
  const token = request.headers.get('Token');
  if (!isObject(body) || typeof body.username !== 'string' || !body.username.trim()
    || body.username.length > 320 || typeof body.authphrase !== 'string'
    || !/^[a-f0-9]{64}$/.test(body.authphrase) || !token || token.length > 10000) {
    return Response.json({ message: 'Invalid authentication request.' }, { status: 400 });
  }
  try {
    // BeWhere verifies the hash. Only its response establishes the server identity/role.
    const response = await fetch(`${apiBase.replace(/\/+$/, '')}/authentication`, {
      method: 'POST', signal: AbortSignal.any([request.signal, AbortSignal.timeout(20_000)]),
      headers: { Token: token, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: body.username.trim(), authphrase: body.authphrase, tidHashAlgorithm: '2', tidSession: '3' }),
    });
    const data: unknown = await response.json().catch(() => null);
    const headers = { 'Cache-Control': 'no-store', 'Set-Cookie': sessions.revoke(request) };
    if (!response.ok || !isObject(data) || data.reasonCode !== undefined) {
      return Response.json({ message: 'Invalid credentials or BeWhere authentication was rejected.' }, { status: response.ok ? 401 : response.status, headers });
    }
    const user = isObject(data.user) ? data.user : {};
    const roleId = Number(user.tidRole ?? data.tidRole);
    const role = Object.hasOwn(API_ROLE_NAMES, roleId) ? API_ROLE_NAMES[roleId] : undefined;
    if (!role) return Response.json({ message: 'This user is not allowed to sign in.' }, { status: 403, headers });
    const object = isObject(data.object) ? data.object : {};
    const userId = text(object.id ?? data.id ?? user.id) || body.username.trim();
    const accountId = text(user.accountId ?? data.accountId);
    const owner: RequestOwner = {
      key: JSON.stringify([accountId, userId]), userId, accountId,
      customerName: text(user.accountName) || text(user.name) || body.username.trim(),
      requesterName: text(user.name) || body.username.trim(),
    };
    headers['Set-Cookie'] = sessions.issue({ owner, role });
    return Response.json(data, { headers });
  } catch {
    return Response.json({ message: 'The server could not authenticate with BeWhere. Please retry.' }, { status: 502 });
  }
}
