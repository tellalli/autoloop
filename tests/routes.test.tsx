import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '@/App';
import { apiFetch } from '@/config/api';
import { AUTH_STORAGE_KEY, readSession, saveSession } from '@/auth/session';
import { authResponse, jsonResponse, session } from './fixtures';
import { fetchTickets } from '@/features/requests/api';
import { requestOwner } from './request-fixtures';

vi.mock('@/features/requests/api', () => ({ fetchTickets: vi.fn(), saveTicket: vi.fn() }));
beforeEach(() => {
  vi.mocked(fetchTickets).mockResolvedValue({ viewer: { owner: requestOwner, role: 'Administrator' }, requests: [] });
});

function renderAt(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><AppRoutes /></MemoryRouter>);
}

function fillLogin() {
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'user@example.test' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('public and protected routes', () => {
  it('opens the public page without requesting any API data', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('idea to shipped');
    expect(screen.getByRole('link', { name: 'Sign in' }).getAttribute('href')).toBe('/login');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('redirects unauthenticated main-page visits to login', () => {
    renderAt('/app');
    expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Welcome, Test User.' })).toBeNull();
  });

  it('signs in, saves the session, and opens the blank main page', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ Salt: 'test-salt', Token: 'test-challenge-token' }))
      .mockResolvedValueOnce(jsonResponse(authResponse));
    vi.stubGlobal('fetch', fetchMock);
    renderAt('/login');
    fillLogin();
    expect(screen.getByRole('button', { name: 'Signing in…' }).matches(':disabled')).toBe(true);
    expect(await screen.findByRole('heading', { name: 'Welcome, Test User.' })).toBeTruthy();
    expect(readSession()).toEqual(session);
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).not.toContain('test-password');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('shows a failed login and allows retry without creating a session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ Message: 'Invalid credentials' }, 401)));
    renderAt('/login');
    fillLogin();
    expect((await screen.findByRole('alert')).textContent).toBe('Invalid credentials');
    expect((screen.getByRole('button', { name: 'Sign in' }) as HTMLButtonElement).disabled).toBe(false);
    expect(readSession()).toBeNull();
  });

  it('restores a session and loads tickets without fetching other BeWhere feature data', () => {
    saveSession(session);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderAt('/app');
    expect(screen.getByRole('heading', { name: 'Welcome, Test User.' })).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('redirects an already signed-in user from login to the main page', () => {
    saveSession(session);
    renderAt('/login');
    expect(screen.getByRole('heading', { name: 'Welcome, Test User.' })).toBeTruthy();
  });

  it('signs out without clearing unrelated applications or browser data', () => {
    saveSession(session);
    localStorage.setItem('bewhere_portal_auth_user', 'unrelated-source-session');
    renderAt('/app');
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeTruthy();
    expect(readSession()).toBeNull();
    expect(localStorage.getItem('bewhere_portal_auth_user')).toBe('unrelated-source-session');
  });

  it('returns to login when an authenticated request reports an expired session', async () => {
    saveSession(session);
    renderAt('/app');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 401)));
    await act(async () => { await apiFetch('/test', session.token); });
    expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeTruthy();
  });

  it('signs out when another tab removes the AutoLoop session', async () => {
    saveSession(session);
    renderAt('/app');
    act(() => {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      window.dispatchEvent(new StorageEvent('storage', { key: AUTH_STORAGE_KEY }));
    });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Welcome back.' })).toBeTruthy());
  });

  it('can toggle password visibility', () => {
    renderAt('/login');
    const input = screen.getByLabelText('Password') as HTMLInputElement;
    expect(input.type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input.type).toBe('text');
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input.type).toBe('password');
  });

  it('does not expose any source-project feature route', () => {
    renderAt('/assets');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('idea to shipped');
  });
});
