import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isRequest, missingFields, TICKET_FIELDS, type TicketRequest } from '../src/features/requests/model';
import type { TicketIdentity } from './sessions';

const HEADER = ['request_id', 'created_at', 'customer_id', 'customer_name', 'summary', 'status', 'github_issue',
  'transcript_file', 'submitted_at', 'triaged_at', 'approved_at', 'merged_at', 'shipped_at', 'notes',
  'owner_user_id', 'owner_account_id', 'updated_at', 'revision', 'handoff', 'request_json'];

export class StoreError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function cell(value: string): string {
  const safe = /^\s*[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], value = '', quoted = false, closed = false;
  const input = csv.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { value += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else value += char;
    } else if (char === ',' || char === '\n' || char === '\r') {
      row.push(value); value = ''; closed = false;
      if (char !== ',') {
        if (char === '\r' && input[i + 1] === '\n') i++;
        if (row.some((entry) => entry !== '')) rows.push(row);
        row = [];
      }
    } else if (char === '"' && value === '' && !closed) quoted = true;
    else {
      if (closed || char === '"') throw new Error('Invalid CSV quoting.');
      value += char;
    }
  }
  if (quoted) throw new Error('Unclosed CSV value.');
  if (value || row.length || closed) { row.push(value); rows.push(row); }
  return rows;
}

function serialize(records: TicketRequest[]): string {
  return '\uFEFF' + [HEADER.join(','), ...records.map((request) => [
    request.id, request.createdAt, request.owner.accountId, request.owner.customerName, request.ticket.title,
    request.status, '', '', request.submittedAt || '', '', '', '', '',
    `catalog=${request.catalogVersion}`, request.owner.userId, request.owner.accountId,
    request.updatedAt, String(request.revision), request.handoff, JSON.stringify(request),
  ].map(cell).join(','))].join('\r\n') + '\r\n';
}

function clean(request: TicketRequest, identity: TicketIdentity): TicketRequest {
  return {
    id: request.id, owner: { ...identity.owner }, createdAt: request.createdAt,
    updatedAt: new Date().toISOString(), submittedAt: request.submittedAt,
    status: 'Submitted', handoff: request.handoff, revision: request.revision,
    catalogVersion: request.catalogVersion, composer: '',
    messages: request.messages.map(({ id, role, content, at }) => ({ id, role, content, at })),
    ticket: { ...Object.fromEntries(TICKET_FIELDS.map(([key]) => [key, request.ticket[key]])),
      scopeAssessment: request.ticket.scopeAssessment } as TicketRequest['ticket'],
  };
}

export class CsvTicketStore {
  readonly filename: string;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(readonly directory: string) { this.filename = resolve(directory, 'requests.csv'); }

  async list(identity: TicketIdentity): Promise<TicketRequest[]> {
    await this.queue;
    const records = await this.read();
    return records.filter((record) => identity.role === 'Master' || record.owner.key === identity.owner.key)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  save(input: unknown, identity: TicketIdentity): Promise<TicketRequest> {
    const operation = this.queue.then(async () => {
      if (!isRequest(input) || input.status !== 'Submitted' || !input.submittedAt || missingFields(input.ticket).length) {
        throw new StoreError(400, 'A confirmed, complete ticket is required.');
      }
      if (input.owner.key !== identity.owner.key) throw new StoreError(403, 'You may save only your own tickets.');
      if (input.handoff === 'ready_for_git' && input.ticket.scopeAssessment === 'out_of_scope') {
        throw new StoreError(400, 'Narrow the frontend scope before marking this ticket ready.');
      }
      const records = await this.read();
      const existing = records.find((record) => record.id === input.id);
      if (existing && existing.owner.key !== identity.owner.key) throw new StoreError(403, 'You may save only your own tickets.');
      if (existing && (input.revision < existing.revision || input.updatedAt < existing.updatedAt)) {
        throw new StoreError(409, 'This ticket has changed. Refresh the ticket list before saving again.');
      }
      const saved = clean(input, identity);
      if (existing) { saved.createdAt = existing.createdAt; records.splice(records.indexOf(existing), 1, saved); }
      else records.push(saved);
      await this.write(records);
      return saved;
    });
    this.queue = operation.catch(() => {});
    return operation;
  }

  private async read(): Promise<TicketRequest[]> {
    let raw: string;
    try { raw = await readFile(this.filename, 'utf8'); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw new StoreError(503, 'The local ticket CSV could not be read. Existing data has not been changed.');
    }
    try {
      const rows = parseCsv(raw);
      if (JSON.stringify(rows[0]) !== JSON.stringify(HEADER)) throw new Error('Unknown CSV format.');
      const records = rows.slice(1).map((row) => {
        if (row.length !== HEADER.length) throw new Error('Invalid CSV row.');
        const record: unknown = JSON.parse(row[HEADER.indexOf('request_json')]);
        if (!isRequest(record) || record.status !== 'Submitted' || record.id !== row[0]
          || record.owner.key !== JSON.stringify([record.owner.accountId, record.owner.userId])) throw new Error('Invalid record.');
        return record;
      });
      if (new Set(records.map((record) => record.id)).size !== records.length) throw new Error('Duplicate ticket ID.');
      return records;
    } catch { throw new StoreError(503, 'The local ticket CSV is invalid. It has been kept unchanged; restore a valid copy before saving.'); }
  }

  private async write(records: TicketRequest[]): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const temporary = `${this.filename}.${randomUUID()}.tmp`;
    try { await writeFile(temporary, serialize(records), { flag: 'wx' }); await rename(temporary, this.filename); }
    catch { throw new StoreError(503, 'The local CSV could not be saved. Your previous file has been kept.'); }
    finally { await rm(temporary, { force: true }).catch(() => {}); }
  }
}
