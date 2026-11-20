import { CATALOG_VERSION } from './capabilities';

export const TICKET_FIELDS = [
  ['title', 'Title'],
  ['problem', 'Problem or use case'],
  ['currentBehavior', 'Current behavior'],
  ['desiredBehavior', 'Desired behavior'],
  ['acceptanceCriteria', 'Acceptance criteria'],
  ['inScope', 'Included frontend work'],
  ['outOfScope', 'Excluded work'],
  ['dataNeeds', 'Data needed'],
  ['dependencies', 'Dependencies and capability evidence'],
  ['assumptions', 'Assumptions'],
  ['openQuestions', 'Open questions'],
] as const;

export type TicketField = typeof TICKET_FIELDS[number][0];
export type Ticket = Record<TicketField, string> & {
  scopeAssessment: 'frontend' | 'needs_review' | 'out_of_scope';
};
export interface Message { id: string; role: 'user' | 'assistant'; content: string; at: string }
export interface RequestOwner { key: string; userId: string; accountId: string; customerName: string; requesterName?: string }
export interface TicketRequest {
  id: string;
  owner: RequestOwner;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  status: 'Draft' | 'Submitted';
  handoff: 'needs_review' | 'ready_for_git';
  revision: number;
  catalogVersion: string;
  composer: string;
  messages: Message[];
  ticket: Ticket;
}
export interface ChatReply { reply: string; ticket: Ticket }

export function emptyTicket(): Ticket {
  return {
    title: '', problem: '', currentBehavior: '', desiredBehavior: '', acceptanceCriteria: '',
    inScope: '', outOfScope: 'New or changed APIs, backend services, and tools.',
    dataNeeds: '', dependencies: '', assumptions: '', openQuestions: '', scopeAssessment: 'needs_review',
  };
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isTicket(value: unknown): value is Ticket {
  return isObject(value)
    && TICKET_FIELDS.every(([key]) => typeof value[key] === 'string' && (value[key] as string).length <= 8000)
    && (value.title as string).length <= 200
    && typeof value.scopeAssessment === 'string'
    && ['frontend', 'needs_review', 'out_of_scope'].includes(value.scopeAssessment);
}

export function isChatReply(value: unknown): value is ChatReply {
  return isObject(value) && typeof value.reply === 'string' && !!value.reply.trim()
    && value.reply.length <= 12000 && isTicket(value.ticket);
}

function isDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

export function isRequest(value: unknown): value is TicketRequest {
  if (!isObject(value) || !isObject(value.owner) || !Array.isArray(value.messages)) return false;
  return typeof value.id === 'string' && /^REQ-[A-F0-9]{12}$/.test(value.id)
    && ['key', 'userId', 'accountId', 'customerName'].every((key) => typeof value.owner === 'object'
      && typeof (value.owner as Record<string, unknown>)[key] === 'string')
    && isDate(value.createdAt) && isDate(value.updatedAt)
    && (value.submittedAt === null || isDate(value.submittedAt))
    && (value.status === 'Draft' || value.status === 'Submitted')
    && (value.handoff === 'needs_review' || value.handoff === 'ready_for_git')
    && typeof value.revision === 'number' && Number.isInteger(value.revision) && value.revision > 0
    && typeof value.catalogVersion === 'string'
    && typeof value.composer === 'string'
    && value.messages.every((message) => isObject(message) && typeof message.id === 'string'
      && (message.role === 'user' || message.role === 'assistant')
      && typeof message.content === 'string' && isDate(message.at))
    && isTicket(value.ticket);
}

export function createRequest(owner: RequestOwner, name: string): TicketRequest {
  const now = new Date().toISOString();
  return {
    id: `REQ-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`,
    owner, createdAt: now, updatedAt: now, submittedAt: null, status: 'Draft',
    handoff: 'needs_review', revision: 1, catalogVersion: CATALOG_VERSION, composer: '', ticket: emptyTicket(),
    messages: [{ id: crypto.randomUUID(), role: 'assistant', at: now,
      content: `Hi ${name}. What would you like to improve? Tell me what you want to do and what should happen. We’ll turn it into a clear frontend request for you to review.` }],
  };
}

export function reviseRequest(request: TicketRequest, changes: Partial<TicketRequest>): TicketRequest {
  return { ...request, ...changes, status: 'Draft', submittedAt: null, handoff: 'needs_review',
    revision: request.status === 'Submitted' ? request.revision + 1 : request.revision,
    updatedAt: new Date().toISOString() };
}

export function missingFields(ticket: Ticket): string[] {
  return TICKET_FIELDS.filter(([key]) => ['title', 'problem', 'desiredBehavior', 'acceptanceCriteria'].includes(key)
    && !ticket[key].trim()).map(([, label]) => label);
}

export function mergeRequests(...sets: TicketRequest[][]): TicketRequest[] {
  const result = new Map<string, TicketRequest>();
  for (const requests of sets) for (const request of requests) {
    const previous = result.get(request.id);
    if (!previous || request.updatedAt >= previous.updatedAt) result.set(request.id, request);
  }
  return [...result.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
