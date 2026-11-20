import { expireSession } from '@/auth/session';

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'https://api.bewhere.com'
).replace(/\/+$/, '');

export function buildApiUrl(path: `/${string}`): string {
  return `${API_BASE_URL}${path}`;
}

// Use this for future authenticated requests. BeWhere uses Token, not Bearer.
// Login itself uses plain fetch so a rejected password doesn't expire a session.
export async function apiFetch(
  path: `/${string}`,
  token: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  headers.set('Token', token);
  const response = await fetch(buildApiUrl(path), { ...init, headers });
  if (response.status === 401) expireSession();
  return response;
}
