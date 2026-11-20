import { describe, expect, it } from 'vitest';
import { createRequest, mergeRequests, reviseRequest } from '@/features/requests/model';
import { issueMarkdown, requestsCsv } from '@/features/requests/exports';
import { loadRequests, storeRequests } from '@/features/requests/storage';
import { requestOwner, submittedRequest } from './request-fixtures';

describe('local ticket records', () => {
  it('persists a request and conversation separately from authentication and other users', () => {
    const request = submittedRequest();
    storeRequests(requestOwner, [request]);
    expect(loadRequests(requestOwner)).toEqual([request]);
    expect(loadRequests({ ...requestOwner, key: 'another-user' })).toEqual([]);
    expect(localStorage.getItem('autoloop_auth_user_v1')).toBeNull();
  });

  it('refuses to overwrite a record under a different owner', () => {
    expect(() => storeRequests({ ...requestOwner, key: 'another-user' }, [submittedRequest()])).toThrow('owner mismatch');
  });

  it('reports malformed storage rather than silently discarding it', () => {
    const key = 'autoloop_requests_v1:' + requestOwner.key;
    localStorage.setItem(key, '{invalid');
    expect(() => loadRequests(requestOwner)).toThrow();
    expect(localStorage.getItem(key)).toBe('{invalid');
  });

  it('invalidates submission and handoff when a confirmed ticket is revised', () => {
    const request = { ...submittedRequest(), handoff: 'ready_for_git' as const };
    const revised = reviseRequest(request, { ticket: { ...request.ticket, title: 'A revised idea' } });
    expect(revised).toMatchObject({ id: request.id, status: 'Draft', handoff: 'needs_review', submittedAt: null, revision: 2 });
    expect(reviseRequest(revised, {}).revision).toBe(2);
  });

  it('merges by stable ID without regressing newer records', () => {
    const request = submittedRequest();
    const older = { ...request, updatedAt: '2026-11-18T12:00:00Z' };
    const newer = { ...request, updatedAt: '2026-11-19T12:00:00Z', handoff: 'ready_for_git' as const };
    expect(mergeRequests([newer], [older])).toEqual([newer]);
  });
});

describe('CSV and issue export', () => {
  it('uses the source CSV columns, quoting commas/newlines/quotes and excluding drafts', () => {
    const request = submittedRequest();
    request.ticket.title = 'A "compact",\nview';
    const csv = requestsCsv([request, createRequest(requestOwner, 'Test User')]);
    expect(csv).toContain('request_id,created_at,customer_id,customer_name,summary,status,github_issue,transcript_file,submitted_at,triaged_at,approved_at,merged_at,shipped_at,notes');
    expect(csv).toContain('"A ""compact"",\nview"');
    expect(csv.match(/REQ-[A-F0-9]{12}/g)).toHaveLength(1); // Only the saved request; no nonexistent transcript-file reference.
    expect(csv).not.toContain('Hi Test User');
  });

  it('protects exported text cells against spreadsheet formula execution', () => {
    const request = submittedRequest();
    request.ticket.title = '=HYPERLINK("example.test")';
    expect(requestsCsv([request])).toContain('"\'=HYPERLINK(');
  });

  it('does not include account metadata/transcripts and redacts known private values from the brief', () => {
    const request = submittedRequest();
    request.ticket.problem = 'Test User asked for this; user@example.test; test-secret-token';
    request.messages.push({ id: 'private', role: 'user', content: 'Private conversation content', at: request.createdAt });
    const brief = issueMarkdown(request, ['Test User', 'user@example.test', 'test-secret-token']);
    expect(brief).toContain('[redacted]');
    for (const value of ['Test User', 'user@example.test', 'test-secret-token', 'Test account', 'Private conversation content']) {
      expect(brief).not.toContain(value);
    }
    expect(brief).toContain('does not authorize implementation');
  });

  it('preserves unresolved dependencies and the scope-review flag in the Git handoff', () => {
    const request = submittedRequest();
    request.ticket.scopeAssessment = 'needs_review';
    request.ticket.dependencies = 'Map renderer and location source are not yet verified.';
    request.ticket.openQuestions = 'Does the existing API provide coordinates?';
    const brief = issueMarkdown(request);
    expect(brief).toContain('Scope assessment: Needs scope review');
    expect(brief).toContain(request.ticket.dependencies);
    expect(brief).toContain(request.ticket.openQuestions);
    expect(brief).toContain(`Revision: ${request.revision}`);
  });
});
