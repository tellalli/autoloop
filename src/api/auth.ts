import { buildApiUrl } from '@/config/api';
import { API_ROLE_NAMES } from '@/auth/apiRoles';
import type { AuthUser } from '@/auth/auth.types';

type ApiObject = Record<string, unknown>;

function asObject(value: unknown): ApiObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as ApiObject : {};
}

function text(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : '';
}

async function readResponse(response: Response): Promise<ApiObject> {
  const data = asObject(await response.json().catch(() => null));
  if (!response.ok || data.reasonCode !== undefined) {
    throw new Error(
      text(data.reasonText ?? data.Message ?? data.message) ||
      (response.status === 401 || response.status === 403
        ? 'Invalid username or password.'
        : `Unable to sign in. Please try again. (${response.status})`),
    );
  }
  return data;
}

async function sha256(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Adapted from atagforbusiness/src/api/auth.ts. No account/device lookups occur.
export async function login(username: string, password: string): Promise<AuthUser> {
  username = username.trim();
  if (!username || !password) throw new Error('Enter your username and password.');
  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure sign-in requires HTTPS or localhost.');
  }

  // One timeout covers the whole salt/hash/authentication handshake.
  const signal = AbortSignal.timeout(20_000);
  try {
    const challenge = await readResponse(await fetch(
      buildApiUrl(`/authentication/${encodeURIComponent(username)}/?type=WEB`),
      { headers: { Accept: 'application/json' }, signal },
    ));
    const salt = text(challenge.Salt ?? challenge.salt);
    const initialToken = text(challenge.Token ?? challenge.token);
    if (!salt || !initialToken) {
      throw new Error('The authentication server returned an incomplete challenge.');
    }

    const authphrase = await sha256(salt + await sha256(password));
    const data = await readResponse(await fetch('/__autoloop/authenticate', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Token: initialToken,
      },
      body: JSON.stringify({ authphrase, username, tidHashAlgorithm: '2', tidSession: '3' }),
      signal,
    }));

    const user = asObject(data.user);
    const tidRole = Number(user.tidRole ?? data.tidRole);
    const role = Object.hasOwn(API_ROLE_NAMES, tidRole) ? API_ROLE_NAMES[tidRole] : undefined;
    if (!role) throw new Error('This user is not allowed to sign in.');
    // Some BeWhere responses keep using the challenge token after authentication.
    const token = text(data.Token ?? data.token ?? initialToken);
    if (!token) throw new Error('The authentication server did not return a session token.');

    return {
      id: text(asObject(data.object).id ?? data.id ?? user.id),
      username,
      name: text(user.name) || username,
      email: text(user.email ?? data.email),
      role,
      token,
      accountId: text(user.accountId ?? data.accountId),
      accountName: text(user.accountName),
    };
  } catch (error) {
    if (signal.aborted) throw new Error('Sign-in timed out. Please try again.');
    if (error instanceof TypeError) {
      throw new Error('Unable to reach BeWhere. Check your connection and try again.');
    }
    throw error;
  }
}
