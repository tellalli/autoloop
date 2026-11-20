import { expireSession } from '@/auth/session';
import { isRole } from '@/auth/apiRoles';
import type { Role } from '@/auth/auth.types';
import { isObject, isRequest, type RequestOwner, type TicketRequest } from './model';

export interface TicketList { viewer: { owner: RequestOwner; role: Role }; requests: TicketRequest[] }

async function read(response: Response): Promise<unknown> {
  const data: unknown = await response.json().catch(() => null);
  if (response.status === 401) expireSession();
  if (!response.ok) throw new Error(isObject(data) && typeof data.error === 'string' ? data.error : 'The local ticket store is unavailable. Please retry.');
  return data;
}

export async function fetchTickets(signal?: AbortSignal): Promise<TicketList> {
  const data = await read(await fetch('/__autoloop/requests', { signal, cache: 'no-store' }));
  if (!isObject(data) || !isObject(data.viewer) || !isRole(data.viewer.role)
    || !isObject(data.viewer.owner) || typeof data.viewer.owner.key !== 'string'
    || !Array.isArray(data.requests) || !data.requests.every(isRequest)) throw new Error('The server returned an invalid ticket list.');
  return data as unknown as TicketList;
}

export async function saveTicket(request: TicketRequest, signal?: AbortSignal): Promise<TicketRequest> {
  const data = await read(await fetch('/__autoloop/requests', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({ request }),
  }));
  if (!isObject(data) || !isRequest(data.request)) throw new Error('The server returned an invalid saved ticket.');
  return data.request;
}
