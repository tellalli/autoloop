import { describe, expect, it, vi } from 'vitest';
import { fetchTickets, saveTicket } from '@/features/requests/api';
import { readSession, saveSession } from '@/auth/session';
import { session } from './fixtures';
import { requestOwner, submittedRequest } from './request-fixtures';

describe('browser ticket API', () => {
  it('loads the trusted viewer and records without posting a browser role or token', async () => {
    const result = { viewer: { owner: requestOwner, role: 'Master' }, requests: [submittedRequest()] };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(result)); vi.stubGlobal('fetch', fetchMock);
    expect(await fetchTickets()).toEqual(result);
    expect(fetchMock).toHaveBeenCalledWith('/__autoloop/requests', { cache: 'no-store', signal: undefined });
  });

  it('clears the old browser login when no verified local session exists', async () => {
    saveSession(session);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: 'Sign in again to access the local ticket store.' }, { status: 401 })));
    await expect(fetchTickets()).rejects.toThrow('Sign in again');
    expect(readSession()).toBeNull();
  });

  it('retains explicit server save errors and rejects invalid successful responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ error: 'The local CSV could not be saved.' }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ request: {} })));
    await expect(saveTicket(submittedRequest())).rejects.toThrow('The local CSV could not be saved.');
    await expect(saveTicket(submittedRequest())).rejects.toThrow('invalid saved ticket');
  });
});
