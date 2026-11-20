import { isObject, isRequest, mergeRequests, type RequestOwner, type TicketRequest } from './model';

const PREFIX = 'autoloop_requests_v1:';
export function requestStorageKey(owner: RequestOwner): string { return PREFIX + owner.key; }

function parseRecords(raw: string, owner: RequestOwner): TicketRequest[] {
  const data: unknown = JSON.parse(raw);
  if (!isObject(data) || data.version !== 1 || data.owner !== owner.key || !Array.isArray(data.requests)
    || !data.requests.every((entry) => isRequest(entry) && entry.owner.key === owner.key)) {
    throw new Error('Saved requests could not be read. Your existing data has not been overwritten.');
  }
  return mergeRequests(data.requests as TicketRequest[]);
}

function serialize(owner: RequestOwner, requests: TicketRequest[]): string {
  if (requests.some((request) => request.owner.key !== owner.key)) throw new Error('Request owner mismatch.');
  return JSON.stringify({ version: 1, owner: owner.key, requests }, null, 2);
}

export function loadRequests(owner: RequestOwner): TicketRequest[] {
  const raw = localStorage.getItem(requestStorageKey(owner));
  return raw ? parseRecords(raw, owner) : [];
}

export function storeRequests(owner: RequestOwner, requests: TicketRequest[]): void {
  localStorage.setItem(requestStorageKey(owner), serialize(owner, requests));
}
