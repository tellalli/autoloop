import { TICKET_FIELDS, type TicketRequest } from './model';

function csvCell(value: string): string {
  // Quoting alone does not prevent spreadsheet formula interpretation.
  const safe = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function requestsCsv(requests: TicketRequest[]): string {
  const header = 'request_id,created_at,customer_id,customer_name,summary,status,github_issue,transcript_file,submitted_at,triaged_at,approved_at,merged_at,shipped_at,notes';
  const rows = requests.filter((request) => request.status === 'Submitted').map((request) => [
    request.id, request.createdAt, request.owner.accountId || request.owner.userId, request.owner.customerName,
    request.ticket.title, request.status, '', '', request.submittedAt || '',
    '', '', '', '', `handoff=${request.handoff}; revision=${request.revision}; catalog=${request.catalogVersion}`,
  ].map(csvCell).join(','));
  return [header, ...rows].join('\r\n') + '\r\n';
}

export function issueMarkdown(request: TicketRequest, privateValues: string[] = []): string {
  const assessment = request.ticket.scopeAssessment === 'frontend' ? 'Frontend scope'
    : request.ticket.scopeAssessment === 'out_of_scope' ? 'Outside current scope' : 'Needs scope review';
  let result = `# ${request.ticket.title || 'Untitled request'}\n\nRequest: ${request.id} · Revision: ${request.revision}\nCapability catalog: ${request.catalogVersion}\n\n`
    + `Scope assessment: ${assessment}\n\n`
    + 'Frontend changes only. This brief is for human triage and scoping; it does not authorize implementation.\n\n'
    + TICKET_FIELDS.filter(([key]) => key !== 'title').map(([key, label]) =>
      `## ${label}\n\n${request.ticket[key].trim() || 'Not specified; clarify during scoping.'}\n`).join('\n');
  for (const value of privateValues.filter((entry) => entry.length >= 4).sort((a, b) => b.length - a.length)) {
    const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'gi'), '[redacted]');
  }
  return result;
}

export function downloadFile(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
