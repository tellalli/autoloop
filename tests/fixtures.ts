import type { AuthUser } from '@/auth/auth.types';

// Synthetic fixtures only. No credentials or records from the source project.
export const authResponse = {
  Token: 'test-session-token',
  object: { id: 'test-user-id' },
  user: {
    tidRole: 5,
    name: 'Test User',
    email: 'user@example.test',
    accountId: 'test-account-id',
    accountName: 'Test account',
  },
};

export const session: AuthUser = {
  id: 'test-user-id',
  username: 'user@example.test',
  name: 'Test User',
  email: 'user@example.test',
  role: 'Administrator',
  token: 'test-session-token',
  accountId: 'test-account-id',
  accountName: 'Test account',
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
