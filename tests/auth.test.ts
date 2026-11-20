import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { login } from '@/api/auth';
import { API_BASE_URL, apiFetch } from '@/config/api';
import { AUTH_STORAGE_KEY, readSession, saveSession, SESSION_EXPIRED_EVENT } from '@/auth/session';
import { authResponse, jsonResponse, session } from './fixtures';

function mockLogin(response: unknown = authResponse, status = 200) {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(jsonResponse({ Salt: 'test-salt', Token: 'test-challenge-token' }))
    .mockResolvedValueOnce(jsonResponse(response, status));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('BeWhere authentication', () => {
  it('uses the salted double SHA-256 handshake and only the two authentication endpoints', async () => {
    const fetchMock = mockLogin();
    const result = await login(' user@example.test ', 'test-password');
    expect(result).toEqual(session);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE_URL}/authentication/user%40example.test/?type=WEB`);
    expect(fetchMock.mock.calls[1][0]).toBe('/__autoloop/authenticate');
    const request = fetchMock.mock.calls[1][1] as RequestInit;
    const digest = (value: string) => createHash('sha256').update(value).digest('hex');
    expect(JSON.parse(request.body as string)).toEqual({
      username: 'user@example.test',
      authphrase: digest('test-salt' + digest('test-password')),
      tidHashAlgorithm: '2',
      tidSession: '3',
    });
    expect(request.headers).toMatchObject({ Token: 'test-challenge-token' });
    expect(request.body).not.toContain('test-password');
    expect(localStorage.length).toBe(0);
  });

  it('supports lowercase challenge and session fields', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(jsonResponse({ salt: 'test-salt', token: 'test-challenge-token' }))
      .mockResolvedValueOnce(jsonResponse({ ...authResponse, Token: undefined, token: 'lowercase-token' })));
    expect((await login('user@example.test', 'test-password')).token).toBe('lowercase-token');
  });

  it('supports the source API contract that retains the authenticated challenge token', async () => {
    mockLogin({ ...authResponse, Token: undefined });
    expect((await login('user@example.test', 'test-password')).token).toBe('test-challenge-token');
  });

  it.each([-2, -1, 1, 2, 3, 4, 5, 6, 7])('admits supported API role %s', async (tidRole) => {
    mockLogin({ ...authResponse, user: { ...authResponse.user, tidRole } });
    expect((await login('user@example.test', 'test-password')).token).toBe('test-session-token');
  });

  it.each([0, 8, 99, undefined, 'toString'])('rejects unsupported or missing API role %s', async (tidRole) => {
    mockLogin({ ...authResponse, user: { ...authResponse.user, tidRole } });
    await expect(login('user@example.test', 'test-password')).rejects.toThrow('not allowed');
  });

  it('rejects a challenge error without posting credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ reasonCode: 1, reasonText: 'Unknown user' }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(login('user@example.test', 'test-password')).rejects.toThrow('Unknown user');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([{ Salt: 'test-salt' }, { Token: 'test-token' }, {}, null])('rejects an incomplete challenge %j', async (challenge) => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(challenge));
    vi.stubGlobal('fetch', fetchMock);
    await expect(login('user@example.test', 'test-password')).rejects.toThrow('incomplete challenge');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects authentication errors returned with HTTP 200, even alongside a role and token', async () => {
    mockLogin({ ...authResponse, reasonCode: 1, reasonText: 'Invalid credentials' });
    await expect(login('user@example.test', 'test-password')).rejects.toThrow('Invalid credentials');
  });

  it('shows the API error for rejected credentials', async () => {
    mockLogin({ Message: 'Invalid credentials' }, 401);
    await expect(login('user@example.test', 'wrong-password')).rejects.toThrow('Invalid credentials');
  });

  it('reports network failures without treating them as a session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(login('user@example.test', 'test-password')).rejects.toThrow('Unable to reach BeWhere');
  });

  it('does not send empty credentials', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(login('   ', 'test-password')).rejects.toThrow('Enter your username');
    await expect(login('user@example.test', '')).rejects.toThrow('Enter your username');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('AutoLoop sessions', () => {
  it('persists only the authentication identity under its own storage key', () => {
    saveSession(session);
    expect(readSession()).toEqual(session);
    expect(localStorage.getItem('bewhere_portal_auth_user')).toBeNull();
    saveSession(null);
    expect(readSession()).toBeNull();
  });

  it.each(['{invalid', 'null', '{}', '{"token":"test-token"}'])('ignores corrupt or incomplete stored sessions: %s', (raw) => {
    localStorage.setItem(AUTH_STORAGE_KEY, raw);
    expect(readSession()).toBeNull();
  });

  it('ignores atagforbusiness sessions and data', () => {
    localStorage.setItem('bewhere_portal_auth_user', JSON.stringify(session));
    expect(readSession()).toBeNull();
  });

  it('clears an expired session on 401 and sends the BeWhere Token header', async () => {
    saveSession(session);
    const listener = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, listener, { once: true });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 401));
    vi.stubGlobal('fetch', fetchMock);
    expect((await apiFetch('/test', session.token)).status).toBe(401);
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('Token')).toBe(session.token);
    expect(readSession()).toBeNull();
    expect(listener).toHaveBeenCalledOnce();
  });

  it('keeps the session on a permission denial', async () => {
    saveSession(session);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 403)));
    await apiFetch('/test', session.token);
    expect(readSession()).toEqual(session);
  });
});
