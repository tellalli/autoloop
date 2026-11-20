// @vitest-environment node
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import type { AddressInfo } from 'node:net';
import { createServer, normalizePath } from 'vite';
import { expect, it, vi } from 'vitest';
import { chatPlugin } from '../server/chat-plugin';
import { authResponse } from './fixtures';
import { submittedRequest } from './request-fixtures';

it('serves authenticated ticket requests and blocks direct CSV access through Vite', async () => {
  await mkdir(resolve('.temp'), { recursive: true });
  const directory = await mkdtemp(resolve('.temp', 'ticket-http-'));
  const realFetch = globalThis.fetch;
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    if (String(input) === 'https://bewhere.example.test/authentication') return Response.json(authResponse);
    return realFetch(input, init);
  }));
  const server = await createServer({ configFile: false, root: resolve('.'), logLevel: 'silent',
    plugins: [chatPlugin({ AUTOLOOP_DATA_DIR: directory, VITE_API_BASE_URL: 'https://bewhere.example.test' })],
    server: { host: '127.0.0.1', port: 0, watch: null }, optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    await server.listen();
    const base = `http://127.0.0.1:${(server.httpServer!.address() as AddressInfo).port}`;
    expect((await realFetch(base + '/__autoloop/requests')).status).toBe(401);
    const login = await realFetch(base + '/__autoloop/authenticate', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Token: 'synthetic-challenge' },
      body: JSON.stringify({ username: 'user@example.test', authphrase: 'a'.repeat(64) }) });
    expect(login.status).toBe(200);
    const cookie = login.headers.get('Set-Cookie')!.split(';')[0];
    const save = await realFetch(base + '/__autoloop/requests', { method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json', Origin: base },
      body: JSON.stringify({ request: submittedRequest() }) });
    expect(save.status).toBe(200);
    const saved = (await save.json()).request;
    expect((await (await realFetch(base + '/__autoloop/requests', { headers: { Cookie: cookie } })).json()).requests).toEqual([saved]);
    expect(await readFile(resolve(directory, 'requests.csv'), 'utf8')).toContain(saved.id);
    const relative = normalizePath(directory.slice(resolve('.').length));
    for (const path of [`${relative}/requests.csv`, `${relative}/requests.csv?raw`,
      `/@fs/${normalizePath(directory)}/requests.csv?import`,
      '/.gitbrief/runs/brief.md?raw', `/@fs/${normalizePath(resolve('.gitbrief'))}/runs/review.json`,
      '/.data/gitbrief/runs/brief.md?raw', `/@fs/${normalizePath(resolve('.data/gitbrief'))}/runs/review.json`,
      `${relative.replaceAll('/', '/%2e/')}/requests.csv`,
      ...(process.platform === 'win32' ? [`${relative.toUpperCase()}/REQUESTS.CSV`] : [])]) {
      expect((await realFetch(base + path)).status, path).toBe(403);
    }
    const logout = await realFetch(base + '/__autoloop/session', { method: 'DELETE', headers: { Cookie: cookie } });
    expect(logout.status).toBe(200);
    expect((await realFetch(base + '/__autoloop/requests', { headers: { Cookie: cookie } })).status).toBe(401);
  } finally {
    await server.close();
    if (!directory.startsWith(resolve('.temp') + sep)) throw new Error('Unexpected test directory.');
    await rm(directory, { recursive: true, force: true });
  }
}, 15_000);

it('rejects a data directory that would put private records in public assets', () => {
  expect(() => chatPlugin({ AUTOLOOP_DATA_DIR: 'public' })).toThrow(/private directory/);
  expect(() => chatPlugin({ AUTOLOOP_DATA_DIR: 'public/tickets' })).toThrow(/private directory/);
  expect(() => chatPlugin({ AUTOLOOP_DATA_DIR: '.' })).toThrow(/private directory/);
});
