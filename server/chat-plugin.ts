import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { normalizePath } from 'vite';
import { posix, relative, resolve } from 'node:path';
import { handleChat, type ChatEnvironment } from './chat';
import { CsvTicketStore } from './csv-store';
import { SessionStore } from './sessions';
import { ticketHandlers } from './tickets';

export interface LocalEnvironment extends ChatEnvironment { VITE_API_BASE_URL?: string; AUTOLOOP_DATA_DIR?: string }

export function chatPlugin(env: LocalEnvironment): Plugin {
  const root = resolve(process.cwd());
  const directory = resolve(root, env.AUTOLOOP_DATA_DIR || '.data');
  const publicRoot = resolve(root, 'public');
  if (directory === root || directory === publicRoot || directory.startsWith(publicRoot + '/') || directory.startsWith(publicRoot + '\\')) {
    throw new Error('AUTOLOOP_DATA_DIR must be a private directory, not the project root or public/.');
  }
  const store = new CsvTicketStore(directory);
  const sessions = new SessionStore();
  const handleTickets = ticketHandlers(store, sessions, env.VITE_API_BASE_URL || 'https://api.bewhere.com');
  const privatePaths = [`/${normalizePath(relative(root, directory))}`, `/@fs/${normalizePath(directory)}`,
    '/.gitbrief', `/@fs/${normalizePath(resolve(root, '.gitbrief'))}`,
    '/.data/gitbrief', `/@fs/${normalizePath(resolve(root, '.data/gitbrief'))}`];
  const normalized = (path: string) => {
    const value = posix.normalize(path.replaceAll('\\', '/'));
    return process.platform === 'win32' ? value.toLowerCase() : value;
  };

  async function middleware(req: IncomingMessage, res: ServerResponse, next: () => void) {
    let path: string;
    try { path = decodeURIComponent(req.url?.split('?')[0] || ''); }
    catch { res.writeHead(400); res.end(); return; }
    const canonicalPath = normalized(path);
    if (privatePaths.some((value) => { const prefix = normalized(value); return canonicalPath === prefix || canonicalPath.startsWith(prefix + '/'); })) {
      res.writeHead(403); res.end('Private ticket storage.'); return;
    }
    if (!path.startsWith('/__autoloop/')) { next(); return; }
    const gone = new AbortController();
    res.on('close', () => { if (!res.writableFinished) gone.abort(); });
    try {
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        size += Buffer.byteLength(chunk);
        const limit = path === '/__autoloop/requests' ? 512_000 : 128_000;
        if (size > limit) {
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'The request is too large to save or process.' }));
          return;
        }
        chunks.push(Buffer.from(chunk));
      }
      const headers = new Headers();
      for (const [name, value] of Object.entries(req.headers)) if (typeof value === 'string') headers.set(name, value);
      const request = new Request(`http://${req.headers.host}${req.url}`, {
        method: req.method, headers, signal: gone.signal,
        body: req.method === 'GET' || req.method === 'HEAD' ? undefined : new Uint8Array(Buffer.concat(chunks)),
      });
      const result = path === '/__autoloop/chat' ? await handleChat(request, env) : await handleTickets(request);
      res.statusCode = result.status;
      result.headers.forEach((value, name) => res.setHeader(name, value));
      res.end(await result.text());
    } catch {
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'The local AutoLoop server could not process the request. Please retry.' }));
    }
  }
  return {
    name: 'autoloop-chat',
    config() {
      return { server: { fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.data/**', '**/.gitbrief/**', `${normalizePath(directory)}/**`] } } };
    },
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
}
