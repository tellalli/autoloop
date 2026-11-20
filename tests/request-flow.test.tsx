import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestsWorkspace } from '@/features/requests/RequestsWorkspace';
import { loadRequests } from '@/features/requests/storage';
import * as requestExports from '@/features/requests/exports';
import { session, jsonResponse } from './fixtures';
import { completeTicket, requestOwner, submittedRequest } from './request-fixtures';
import { fetchTickets, saveTicket } from '@/features/requests/api';
import type { TicketRequest } from '@/features/requests/model';

vi.mock('@/features/requests/api', () => ({ fetchTickets: vi.fn(), saveTicket: vi.fn() }));
let savedTickets: TicketRequest[];
beforeEach(() => {
  savedTickets = [];
  vi.mocked(fetchTickets).mockReset().mockImplementation(async () => ({ viewer: { owner: requestOwner, role: 'Administrator' }, requests: [...savedTickets] }));
  vi.mocked(saveTicket).mockReset().mockImplementation(async (record) => {
    const saved = structuredClone(record);
    savedTickets = [...savedTickets.filter((entry) => entry.id !== saved.id), saved];
    return saved;
  });
});

function openRequest() {
  fireEvent.click(screen.getByRole('button', { name: 'Looper' }));
  return within(screen.getByRole('dialog'));
}
function fillTicket(dialog: ReturnType<typeof within>) {
  fireEvent.click(dialog.getByRole('tab', { name: 'Ticket' }));
  for (const [label, value] of [
    ['Title', completeTicket.title], ['Problem or use case', completeTicket.problem],
    ['Desired behavior', completeTicket.desiredBehavior], ['Acceptance criteria', completeTicket.acceptanceCriteria],
  ]) fireEvent.change(dialog.getByLabelText(label, { exact: true }), { target: { value } });
}

describe('browser ticket capture', () => {
  it('opens chat from Looper, resumes without duplicating drafts, and starts a separate conversation explicitly', () => {
    render(<RequestsWorkspace user={session} />);
    expect(screen.queryByRole('button', { name: 'New request' })).toBeNull();
    const launcher = screen.getByRole('button', { name: 'Looper' });
    expect(launcher.getAttribute('aria-haspopup')).toBe('dialog');
    const dialog = openRequest();
    expect(launcher.getAttribute('aria-expanded')).toBe('true');
    expect(dialog.getByRole('tab', { name: 'Conversation', selected: true })).toBeTruthy();
    const originalId = loadRequests(requestOwner)[0].id;
    fireEvent.change(dialog.getByLabelText('Message'), { target: { value: 'Keep this idea' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Close request' }));
    const resumed = openRequest();
    expect(loadRequests(requestOwner)).toHaveLength(1);
    expect((resumed.getByLabelText('Message') as HTMLTextAreaElement).value).toBe('Keep this idea');
    fireEvent.click(resumed.getByRole('button', { name: 'New conversation' }));
    expect(loadRequests(requestOwner)).toHaveLength(2);
    expect(loadRequests(requestOwner).some((record) => record.id === originalId && record.composer === 'Keep this idea')).toBe(true);
    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toBe('');
  });

  it('keeps a draft and composed message when the drawer is closed, reopened, and the app reloads', () => {
    const view = render(<RequestsWorkspace user={session} />);
    const dialog = openRequest();
    fireEvent.change(dialog.getByLabelText('Message'), { target: { value: 'An idea to finish later' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Close request' }));
    view.unmount();
    render(<RequestsWorkspace user={session} />);
    fireEvent.click(screen.getByRole('button', { name: 'Looper' }));
    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toBe('An idea to finish later');
  });

  it('automates chat to structured summary, then requires explicit save and handoff review', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ reply: 'I have drafted the compact-view request. Please review it.', ticket: completeTicket }));
    vi.stubGlobal('fetch', fetchMock);
    render(<RequestsWorkspace user={session} />);
    const dialog = openRequest();
    fireEvent.change(dialog.getByLabelText('Message'), { target: { value: 'Add a compact view to my list.' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Send' }));
    await dialog.findByText('I have drafted the compact-view request. Please review it.');
    expect(loadRequests(requestOwner)[0].status).toBe('Draft');
    const outbound = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(outbound).not.toHaveProperty('owner');
    expect(JSON.stringify(outbound)).not.toContain(session.token);
    fireEvent.click(dialog.getByRole('tab', { name: 'Ticket' }));
    expect((dialog.getByLabelText('Title', { exact: true }) as HTMLInputElement).value).toBe(completeTicket.title);
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm and save request' }));
    await waitFor(() => expect(loadRequests(requestOwner)[0].status).toBe('Submitted'));
    await waitFor(() => expect(dialog.getByRole('tab', { name: 'Git brief', selected: true })).toBeTruthy());
    const ready = dialog.getByRole('button', { name: 'Mark ready for Git' }) as HTMLButtonElement;
    expect(ready.disabled).toBe(true);
    fireEvent.click(dialog.getByRole('checkbox'));
    fireEvent.click(ready);
    await waitFor(() => expect(loadRequests(requestOwner)[0].handoff).toBe('ready_for_git'));
    expect(dialog.getByRole('button', { name: 'Download Markdown' })).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1); // No GitHub write or automatic build.
  });

  it('allows manual capture when AI is unconfigured and retries without duplicating the user message', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'The assistant is not configured yet.' }, 503))
      .mockResolvedValueOnce(jsonResponse({ reply: 'Please review this draft.', ticket: completeTicket }));
    vi.stubGlobal('fetch', fetchMock);
    render(<RequestsWorkspace user={session} />);
    const dialog = openRequest();
    fireEvent.change(dialog.getByLabelText('Message'), { target: { value: 'Add a compact view.' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Send' }));
    expect((await dialog.findByRole('alert')).textContent).toContain('not configured');
    fireEvent.click(dialog.getByRole('button', { name: 'Retry response' }));
    await dialog.findByText('Please review this draft.');
    expect(loadRequests(requestOwner)[0].messages.filter((message) => message.role === 'user')).toHaveLength(1);
  });

  it('requires a new confirmation and review after editing a submitted ticket', async () => {
    render(<RequestsWorkspace user={session} />);
    const dialog = openRequest();
    fillTicket(dialog);
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm and save request' }));
    await waitFor(() => expect(loadRequests(requestOwner)[0].status).toBe('Submitted'));
    fireEvent.click(dialog.getByRole('tab', { name: 'Ticket' }));
    fireEvent.change(dialog.getByLabelText('Title', { exact: true }), { target: { value: 'An updated compact view' } });
    expect(loadRequests(requestOwner)[0]).toMatchObject({ status: 'Draft', handoff: 'needs_review', revision: 2 });
    fireEvent.click(dialog.getByRole('tab', { name: 'Git brief' }));
    expect(dialog.queryByRole('button', { name: 'Mark ready for Git' })).toBeNull();
  });

  it('lets a user save an outside-scope request for review but blocks Git readiness', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({
      reply: 'This needs a new API, which is outside the frontend scope.',
      ticket: { ...completeTicket, scopeAssessment: 'out_of_scope' },
    })));
    render(<RequestsWorkspace user={session} />);
    const dialog = openRequest();
    fireEvent.change(dialog.getByLabelText('Message'), { target: { value: 'Build a new API.' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Send' }));
    await dialog.findByText('This needs a new API, which is outside the frontend scope.');
    fireEvent.click(dialog.getByRole('button', { name: 'Review ticket' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm and save request' }));
    await waitFor(() => expect(dialog.getByRole('tab', { name: 'Git brief', selected: true })).toBeTruthy());
    fireEvent.click(dialog.getByRole('checkbox'));
    expect((dialog.getByRole('button', { name: 'Mark ready for Git' }) as HTMLButtonElement).disabled).toBe(true);
    expect(loadRequests(requestOwner)[0].handoff).toBe('needs_review');
  });

  it('offers a CSV download without requesting folder permissions', async () => {
    const picker = vi.fn();
    vi.stubGlobal('showDirectoryPicker', picker);
    const download = vi.spyOn(requestExports, 'downloadFile').mockImplementation(() => {});
    render(<RequestsWorkspace user={session} />);
    expect(screen.queryByRole('button', { name: /folder|save files/i })).toBeNull();
    expect((screen.getByRole('button', { name: 'Download CSV' }) as HTMLButtonElement).disabled).toBe(true);
    const dialog = openRequest();
    fillTicket(dialog);
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm and save request' }));
    await dialog.findByText('Request saved to the local CSV.');
    fireEvent.click(dialog.getByRole('button', { name: 'Close request' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download CSV' }));
    expect(download).toHaveBeenCalledWith('requests.csv', expect.stringContaining(completeTicket.title), 'text/csv;charset=utf-8');
    expect(download.mock.calls[0][1]).not.toContain('transcripts/');
    expect(picker).not.toHaveBeenCalled();
  });

  it('retains the draft and does not advance when the server CSV save fails', async () => {
    render(<RequestsWorkspace user={session} />);
    const dialog = openRequest();
    fillTicket(dialog);
    vi.mocked(saveTicket).mockRejectedValueOnce(new Error('The local CSV could not be saved.'));
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm and save request' }));
    await dialog.findByText('The local CSV could not be saved.');
    expect(loadRequests(requestOwner)[0].status).toBe('Draft');
    expect(dialog.getByRole('button', { name: 'Confirm and save request' })).toBeTruthy();
  });

  it('saves to the CSV even when the browser cache is full', async () => {
    render(<RequestsWorkspace user={session} />);
    const dialog = openRequest(); fillTicket(dialog);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm and save request' }));
    await dialog.findByText('Request saved to the local CSV.');
    expect(savedTickets[0].status).toBe('Submitted');
    expect(dialog.getByRole('tab', { name: 'Git brief', selected: true })).toBeTruthy();
  });

  it('lets a Master see all saved tickets while keeping other requesters tickets read only', async () => {
    const other = submittedRequest();
    other.owner = { ...requestOwner, key: JSON.stringify([requestOwner.accountId, 'other-user']), userId: 'other-user', requesterName: 'Other User' };
    vi.mocked(fetchTickets).mockResolvedValue({ viewer: { owner: requestOwner, role: 'Master' }, requests: [other] });
    render(<RequestsWorkspace user={{ ...session, role: 'Master' }} />);
    await screen.findByRole('heading', { name: 'All tickets' });
    fireEvent.click(screen.getByRole('button', { name: /Add a compact view/ }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.queryByLabelText('Message')).toBeNull();
    fireEvent.click(dialog.getByRole('tab', { name: 'Ticket' }));
    expect((dialog.getByLabelText('Title', { exact: true }) as HTMLInputElement).disabled).toBe(true);
    expect(dialog.queryByRole('button', { name: 'Confirm and save request' })).toBeNull();
    expect(saveTicket).not.toHaveBeenCalled();
    expect(loadRequests(requestOwner)).toHaveLength(0);
  });

  it('imports earlier browser-confirmed tickets into the CSV on sign-in', async () => {
    const { storeRequests } = await import('@/features/requests/storage');
    const legacy = submittedRequest(); storeRequests(requestOwner, [legacy]);
    render(<RequestsWorkspace user={session} />);
    await waitFor(() => expect(saveTicket).toHaveBeenCalledWith(legacy, expect.any(AbortSignal)));
    expect(savedTickets[0].id).toBe(legacy.id);
  });

  it('reopens confirmed tickets from the server after browser storage is cleared', async () => {
    const view = render(<RequestsWorkspace user={session} />);
    const dialog = openRequest(); fillTicket(dialog);
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm and save request' }));
    await dialog.findByText('Request saved to the local CSV.');
    const id = savedTickets[0].id;
    view.unmount(); localStorage.clear();
    render(<RequestsWorkspace user={session} />);
    fireEvent.click(await screen.findByRole('button', { name: /Add a compact view/ }));
    expect(screen.getByRole('dialog').textContent).toContain(id);
    fireEvent.click(screen.getByRole('tab', { name: 'Ticket' }));
    expect((screen.getByLabelText('Title', { exact: true }) as HTMLInputElement).value).toBe(completeTicket.title);
    expect(screen.getByRole('button', { name: 'Review Git brief' })).toBeTruthy();
    expect(saveTicket).toHaveBeenCalledTimes(1);
  });

  it('does not show another logged-in user the current user’s requests', () => {
    const view = render(<RequestsWorkspace user={session} />);
    const dialog = openRequest();
    fillTicket(dialog);
    view.unmount();
    render(<RequestsWorkspace user={{ ...session, id: 'different-user' }} />);
    expect(screen.queryByRole('button', { name: /Add a compact view/ })).toBeNull();
    expect(screen.getByText('0 requests')).toBeTruthy();
  });
});
