import type { AuthUser } from './auth.types';
import { isRole } from './apiRoles';

export const AUTH_STORAGE_KEY = 'autoloop_auth_user_v1';
export const SESSION_EXPIRED_EVENT = 'autoloop:session-expired';

export function readSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const user: unknown = JSON.parse(raw);
    if (typeof user !== 'object' || user === null) return null;
    const record = user as Record<string, unknown>;
    const fields = ['id', 'username', 'name', 'email', 'token', 'accountId', 'accountName'];
    if (!fields.every((field) => typeof record[field] === 'string')) return null;
    if (!record.token || !record.username || !isRole(record.role)) return null;
    return record as unknown as AuthUser;
  } catch {
    return null;
  }
}

export function saveSession(user: AuthUser | null): void {
  try {
    if (user) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // When browser storage is disabled, the in-memory session still works.
  }
}

export function expireSession(): void {
  saveSession(null);
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
