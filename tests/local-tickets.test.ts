import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CsvTicketStore, parseCsv } from '../server/csv-store';
import { SessionStore, type TicketIdentity } from '../server/sessions';
import { ticketHandlers } from '../server/tickets';
import { authResponse } from './fixtures';
import { requestOwner, submittedRequest } from './request-fixtures';

const admin: TicketIdentity = { owner: requestOwner, role: 'Administrator' };
const other: TicketIdentity = { owner: { ...requestOwner, userId: 'other-user', key: JSON.stringify([requestOwner.accountId, 'other-user']) }, role: 'Administrator' };
const master: TicketIdentity = { owner: { ...requestOwner, userId: 'master-user', accountId: 'master-account', key: JSON.stringify(['master-account', 'master-user']) }, role: 'Master' };
let directory: string, store: CsvTicketStore, sessions: SessionStore;
let handle: ReturnType<typeof ticketHandlers>;
const base = 'http://localhost:5173';

function ticket(identity = admin) { return { ...submittedRequest(), owner: identity.owner }; }
function request(path = '/__autoloop/requests', identity?: TicketIdentity, body?: unknown, method = body ? 'POST' : 'GET') {
  return new Request(base + path, { method,
    headers: { ...(identity ? { Cookie: sessions.issue(identity).split(';')[0] } : {}), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined });
}
beforeEach(async () => {
  await mkdir(resolve('.temp'), { recursive: true });
  directory = await mkdtemp(resolve('.temp', 'ticket-test-'));
  store = new CsvTicketStore(directory); sessions = new SessionStore();
  handle = ticketHandlers(store, sessions, 'https://bewhere.example.test');
});
afterEach(async () => {
  // Only remove the temporary directory created by this test inside the workspace.
  if (!directory.startsWith(resolve('.temp') + sep)) throw new Error('Unexpected test directory.');
  await rm(directory, { recursive: true, force: true });
});

describe('local CSV ticket store', () => {
  it('restores the full ticket and quoted multiline conversation after a new store instance', async () => {
    const record = ticket();
    record.ticket.title = '=SUM(1,2)';
    record.ticket.problem = 'A comma, a "quote", and\r\na second line: café 🗺';
    record.messages.push({ id: 'question', role: 'user', at: record.createdAt, content: 'Show "my places", please.\nNext line' });
    const saved = await store.save(record, admin);
    const raw = await readFile(store.filename, 'utf8');
    expect(parseCsv(raw)[1][4]).toBe("'=SUM(1,2)");
    expect(await new CsvTicketStore(directory).list(admin)).toEqual([saved]);
    expect(saved.ticket.title).toBe(record.ticket.title);
  });

  it('shows a Master all tickets and Administrators only their own user/account tickets', async () => {
    const a = ticket(), b = ticket(other), c = ticket(master);
    await Promise.all([store.save(a, admin), store.save(b, other), store.save(c, master)]);
    expect((await store.list(admin)).map((row) => row.id)).toEqual([a.id]);
    expect((await store.list(other)).map((row) => row.id)).toEqual([b.id]);
    expect(await store.list(master)).toHaveLength(3);
    const sameUserOtherAccount: TicketIdentity = { ...admin, owner: { ...admin.owner, accountId: 'different-account', key: JSON.stringify(['different-account', admin.owner.userId]) } };
    expect(await store.list(sameUserOtherAccount)).toHaveLength(0);
  });

  it('does not lose simultaneous submissions or duplicate a repeated save', async () => {
    const records = Array.from({ length: 8 }, () => ticket());
    await Promise.all(records.map((record) => store.save(record, admin)));
    const saved = (await store.list(admin))[0];
    await store.save(saved, admin);
    expect(await new CsvTicketStore(directory).list(master)).toHaveLength(8);
  });

  it('rejects another owner and a guessed ticket ID even for a Master write', async () => {
    const saved = await store.save(ticket(), admin);
    await expect(store.save(saved, other)).rejects.toMatchObject({ status: 403 });
    await expect(store.save({ ...saved, owner: other.owner }, other)).rejects.toMatchObject({ status: 403 });
    await expect(store.save(saved, master)).rejects.toMatchObject({ status: 403 });
    expect((await store.list(master))[0]).toEqual(saved);
  });

  it('uses the authenticated owner and strips unknown metadata, composer, and credentials', async () => {
    const record = ticket();
    const saved = await store.save({ ...record, token: 'top-level-secret', role: 'Master', composer: 'unsent text',
      owner: { ...record.owner, customerName: 'forged customer', token: 'owner-secret' },
      ticket: { ...record.ticket, token: 'ticket-secret' },
      messages: record.messages.map((message) => ({ ...message, token: 'message-secret' })) }, admin);
    expect(saved.owner).toEqual(admin.owner);
    expect(saved.composer).toBe('');
    const raw = await readFile(store.filename, 'utf8');
    expect(raw).not.toMatch(/top-level-secret|owner-secret|ticket-secret|message-secret|forged customer|unsent text/);
  });

  it('preserves malformed files and refuses writes until they are repaired', async () => {
    const corrupt = 'request_id,summary\n"unclosed';
    await writeFile(store.filename, corrupt);
    await expect(store.list(admin)).rejects.toMatchObject({ status: 503 });
    await expect(store.save(ticket(), admin)).rejects.toMatchObject({ status: 503 });
    expect(await readFile(store.filename, 'utf8')).toBe(corrupt);
  });

  it('rejects incomplete drafts, out-of-scope readiness, and stale edits', async () => {
    const record = ticket();
    await expect(store.save({ ...record, status: 'Draft' }, admin)).rejects.toMatchObject({ status: 400 });
    await expect(store.save({ ...record, ticket: { ...record.ticket, title: '' } }, admin)).rejects.toMatchObject({ status: 400 });
    await expect(store.save({ ...record, handoff: 'ready_for_git', ticket: { ...record.ticket, scopeAssessment: 'out_of_scope' } }, admin)).rejects.toMatchObject({ status: 400 });
    const saved = await store.save(record, admin);
    const updated = await store.save({ ...saved, revision: 2 }, admin);
    await expect(store.save(saved, admin)).rejects.toMatchObject({ status: 409 });
    expect((await store.list(admin))[0].revision).toBe(updated.revision);
  });
});

describe('server authentication and ticket authorization', () => {
  it('requires a server session and ignores caller-provided role claims', async () => {
    await store.save(ticket(), admin); await store.save(ticket(other), other);
    expect((await handle(request())).status).toBe(401);
    const response = await handle(request('/__autoloop/requests?role=Master', admin));
    const result = await response.json();
    expect(result.viewer.role).toBe('Administrator');
    expect(result.requests).toHaveLength(1);
    const forged = request('/__autoloop/requests', admin, { request: ticket(other), role: 'Master' });
    expect((await handle(forged)).status).toBe(403);
  });

  it('gets the role from BeWhere and issues a private session cookie without forwarding role claims', async () => {
    const upstream = vi.fn().mockResolvedValue(Response.json(authResponse)); vi.stubGlobal('fetch', upstream);
    const login = new Request(base + '/__autoloop/authenticate', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Token: 'challenge-token' },
      body: JSON.stringify({ username: 'user@example.test', authphrase: 'a'.repeat(64), role: 'Master', owner: master.owner }) });
    const response = await handle(login);
    expect(response.status).toBe(200);
    const cookie = response.headers.get('Set-Cookie')!;
    expect(cookie).toContain('HttpOnly; SameSite=Strict');
    const listRequest = new Request(base + '/__autoloop/requests', { headers: { Cookie: cookie.split(';')[0] } });
    const list = await (await handle(listRequest)).json();
    expect(list.viewer).toMatchObject({ role: 'Administrator', owner: requestOwner });
    expect(JSON.parse(upstream.mock.calls[0][1].body)).not.toHaveProperty('role');
    expect(upstream.mock.calls[0][0]).toBe('https://bewhere.example.test/authentication');
    await handle(new Request(base + '/__autoloop/session', { method: 'DELETE', headers: { Cookie: cookie.split(';')[0] } }));
    expect((await handle(listRequest)).status).toBe(401);
  });

  it.each([0, 8])('does not admit denied BeWhere role %s', async (tidRole) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ...authResponse, user: { ...authResponse.user, tidRole } })));
    const response = await handle(new Request(base + '/__autoloop/authenticate', { method: 'POST', headers: { Token: 'challenge-token' },
      body: JSON.stringify({ username: 'user@example.test', authphrase: 'a'.repeat(64) }) }));
    expect(response.status).toBe(403);
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });

  it('does not create a session when BeWhere rejects the credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ message: 'Rejected' }, { status: 401 })));
    const response = await handle(new Request(base + '/__autoloop/authenticate', { method: 'POST', headers: { Token: 'challenge-token' },
      body: JSON.stringify({ username: 'user@example.test', authphrase: 'a'.repeat(64) }) }));
    expect(response.status).toBe(401);
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
    expect((await handle(request())).status).toBe(401);
  });

  it('expires sessions and rejects cross-origin writes', async () => {
    const cookie = sessions.issue(admin).split(';')[0];
    const crossOrigin = new Request(base + '/__autoloop/requests', { method: 'POST', headers: { Cookie: cookie, Origin: 'https://other.example' }, body: '{}' });
    expect((await handle(crossOrigin)).status).toBe(403);
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 9 * 60 * 60 * 1000);
    expect((await handle(new Request(base + '/__autoloop/requests', { headers: { Cookie: cookie } }))).status).toBe(401);
  });
});
