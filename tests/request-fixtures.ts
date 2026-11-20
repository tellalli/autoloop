import { createRequest, emptyTicket, type RequestOwner, type Ticket, type TicketRequest } from '@/features/requests/model';

export const requestOwner: RequestOwner = {
  key: JSON.stringify(['test-account-id', 'test-user-id']), userId: 'test-user-id',
  accountId: 'test-account-id', customerName: 'Test account',
};
export const completeTicket: Ticket = {
  ...emptyTicket(), title: 'Add a compact view', problem: 'The list is hard to scan.',
  desiredBehavior: 'Allow switching to compact rows.',
  acceptanceCriteria: 'A compact toggle changes row spacing.\nThe normal layout can be restored.',
  inScope: 'Frontend list layout.', scopeAssessment: 'frontend',
};

export function submittedRequest(): TicketRequest {
  const request = createRequest(requestOwner, 'Test User');
  return { ...request, ticket: { ...completeTicket }, status: 'Submitted', submittedAt: request.createdAt };
}
