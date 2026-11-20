import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileText, MessageCircle, MessageSquarePlus, RefreshCw } from 'lucide-react';
import type { AuthUser } from '@/auth/auth.types';
import { createRequest, isChatReply, missingFields, reviseRequest, type RequestOwner, type TicketField, type TicketRequest } from './model';
import { loadRequests, storeRequests } from './storage';
import { downloadFile, issueMarkdown, requestsCsv } from './exports';
import { RequestDrawer } from './RequestDrawer';
import { CATALOG_VERSION } from './capabilities';
import { fetchTickets, saveTicket, type TicketList } from './api';

export function RequestsWorkspace({ user }: { user: AuthUser }) {
  const owner = useMemo<RequestOwner>(() => ({
    key: JSON.stringify([user.accountId, user.id || user.username]), userId: user.id || user.username,
    accountId: user.accountId, customerName: user.accountName || user.name, requesterName: user.name,
  }), [user.accountId, user.id, user.username, user.accountName, user.name]);
  const [initial] = useState(() => {
    try { return { records: loadRequests(owner), error: '' }; }
    catch { return { records: [] as TicketRequest[], error: 'Saved browser requests could not be read. Your existing data has been kept unchanged.' }; }
  });
  const [records, setRecords] = useState(initial.records);
  const recordsRef = useRef(records);
  const [activeId, setActiveId] = useState<string | null>(null);
  const lastOpenedId = useRef<string | null>(null);
  const [notice, setNotice] = useState('');
  const [storageError, setStorageError] = useState(initial.error);
  const [chatError, setChatError] = useState('');
  const [pending, setPending] = useState(false);
  const chatRequest = useRef<AbortController | null>(null);
  const listRequest = useRef<AbortController | null>(null);
  const saveRequestController = useRef<AbortController | null>(null);
  const [viewer, setViewer] = useState<TicketList['viewer'] | null>(null);
  const viewerRef = useRef<TicketList['viewer'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [storeError, setStoreError] = useState('');
  const active = records.find((request) => request.id === activeId);
  const isMaster = viewer?.role === 'Master';
  const readOnly = !!active && active.owner.key !== (viewer?.owner.key || owner.key);

  useEffect(() => {
    void refreshTickets();
    return () => { chatRequest.current?.abort(); listRequest.current?.abort(); saveRequestController.current?.abort(); };
  }, [owner]);

  async function refreshTickets() {
    if (saveRequestController.current) return;
    listRequest.current?.abort();
    const controller = new AbortController(); listRequest.current = controller;
    setLoading(true); setStoreError('');
    try {
      const result = await fetchTickets(controller.signal);
      if (controller.signal.aborted) return;
      viewerRef.current = result.viewer; setViewer(result.viewer);
      // Import this user's existing browser-confirmed tickets once. Never upload
      // another owner's records, even when the viewer is a Master.
      for (const record of recordsRef.current.filter((entry) => entry.status === 'Submitted' && entry.owner.key === result.viewer.owner.key)) {
        if (!result.requests.some((saved) => saved.id === record.id)) {
          result.requests.push(await saveTicket(record, controller.signal));
        }
      }
      if (controller.signal.aborted) return;
      const drafts = recordsRef.current.filter((entry) => entry.status === 'Draft' && entry.owner.key === result.viewer.owner.key);
      const draftIds = new Set(drafts.map((entry) => entry.id));
      const next = [...drafts, ...result.requests.filter((entry) => !draftIds.has(entry.id))];
      cache(next); display(next);
    } catch (error) {
      if (!controller.signal.aborted) setStoreError(error instanceof Error ? error.message : 'The local ticket store could not be loaded.');
    } finally {
      if (listRequest.current === controller) { listRequest.current = null; setLoading(false); }
    }
  }

  function display(next: TicketRequest[]) {
    recordsRef.current = next;
    setRecords(next);
  }

  function cache(next: TicketRequest[]): boolean {
    if (initial.error) return false;
    try {
      const currentOwner = viewerRef.current?.owner || owner;
      storeRequests(currentOwner, next.filter((record) => record.owner.key === currentOwner.key));
      setStorageError(''); return true;
    }
    catch { setStorageError('Browser storage is unavailable or full. Keep this page open and free up space before retrying.'); return false; }
  }

  function update(id: string, transform: (record: TicketRequest) => TicketRequest) {
    const next = recordsRef.current.map((record) => record.id === id ? transform(record) : record);
    cache(next); display(next); setNotice('');
  }

  function newRequest() {
    if (chatRequest.current || saveRequestController.current) return;
    const request = createRequest(viewerRef.current?.owner || owner, user.name || user.username);
    const next = [request, ...recordsRef.current];
    cache(next); display(next); setChatError(''); setNotice('');
    lastOpenedId.current = request.id; setActiveId(request.id);
  }

  function openLooper() {
    const previous = recordsRef.current.find((record) => record.id === lastOpenedId.current)
      || recordsRef.current.find((record) => record.status === 'Draft' && record.owner.key === (viewerRef.current?.owner.key || owner.key));
    if (previous) {
      lastOpenedId.current = previous.id; setActiveId(previous.id);
    } else newRequest();
  }

  function edit(field: TicketField, value: string) {
    if (!active || readOnly || saving) return;
    update(active.id, (record) => reviseRequest(record, { ticket: { ...record.ticket, [field]: value, scopeAssessment: 'needs_review' } }));
  }

  async function ask(retry = false) {
    if (!active || readOnly || chatRequest.current || saveRequestController.current) return;
    const current = recordsRef.current.find((record) => record.id === active.id)!;
    if (!retry && !current.composer.trim()) return;
    const record = retry ? current : reviseRequest(current, {
      composer: '', messages: [...current.messages, { id: crypto.randomUUID(), role: 'user',
        content: current.composer.trim(), at: new Date().toISOString() }],
    });
    if (record.messages.at(-1)?.role !== 'user') return;
    if (!retry) update(record.id, () => record);
    const controller = new AbortController();
    chatRequest.current = controller; setPending(true); setChatError('');
    try {
      const response = await fetch('/__autoloop/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ messages: record.messages.slice(-40).map(({ role, content }) => ({ role, content })), ticket: record.ticket }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
          ? result.error : 'The assistant could not respond. Your draft is retained; please retry.';
        throw new Error(message);
      }
      if (!isChatReply(result)) throw new Error('The assistant returned an incomplete response. Please retry.');
      update(record.id, (latest) => ({ ...latest, ticket: result.ticket, catalogVersion: CATALOG_VERSION, updatedAt: new Date().toISOString(),
        messages: [...latest.messages, { id: crypto.randomUUID(), role: 'assistant', content: result.reply, at: new Date().toISOString() }] }));
    } catch (error) {
      if (!controller.signal.aborted) setChatError(error instanceof Error ? error.message : 'The assistant could not respond. Please retry.');
    } finally {
      if (chatRequest.current === controller) { chatRequest.current = null; setPending(false); }
    }
  }

  async function persist(record: TicketRequest, message: string): Promise<boolean> {
    if (saveRequestController.current) return false;
    listRequest.current?.abort(); listRequest.current = null; setLoading(false);
    const controller = new AbortController(); saveRequestController.current = controller;
    setSaving(true); setStoreError('');
    try {
      const saved = await saveTicket(record, controller.signal);
      const next = recordsRef.current.map((entry) => entry.id === saved.id ? saved : entry);
      cache(next); display(next); setNotice(message);
      return true;
    } catch (error) {
      if (!controller.signal.aborted) setStoreError(error instanceof Error ? error.message : 'The local CSV could not be saved.');
      return false;
    } finally {
      if (saveRequestController.current === controller) { saveRequestController.current = null; setSaving(false); }
    }
  }

  async function saveRequest(): Promise<boolean> {
    if (!active || readOnly || chatRequest.current || missingFields(active.ticket).length) return false;
    const current = recordsRef.current.find((record) => record.id === active.id)!;
    if (current.status === 'Submitted') return true;
    const now = new Date().toISOString();
    const submitted: TicketRequest = { ...current, status: 'Submitted', submittedAt: now, updatedAt: now, handoff: 'needs_review' };
    return persist(submitted, 'Request saved to the local CSV.');
  }

  function markReady() {
    if (!active || readOnly || chatRequest.current || active.status !== 'Submitted' || active.ticket.scopeAssessment === 'out_of_scope') return;
    void persist({ ...active, handoff: 'ready_for_git', updatedAt: new Date().toISOString() }, 'Request is ready for Git review.');
  }

  const privateValues = [user.token, user.email, user.username, user.name, user.accountName];
  return (
    <>
      <div className="workspace-title"><div>
        <h1>Welcome, {user.name || user.username}.</h1><p className="muted">A conversation today. A clear request for what comes next.</p></div>
      </div>
      {notice && <p className="save-notice" role="status">{notice}</p>}
      {storageError && <p className="error" role="alert">{storageError}</p>}
      {storeError && <p className="error" role="alert">{storeError}</p>}
      <section className="requests-section" aria-labelledby="my-requests-title">
        <div className="requests-heading"><h2 id="my-requests-title">{isMaster ? 'All tickets' : 'My requests'}</h2>
          <div className="request-list-actions"><span className="request-count">{records.length} {records.length === 1 ? 'request' : 'requests'}</span>
            <button className="button button-outline button-small" onClick={() => void refreshTickets()} disabled={loading || pending || saving}>
              <RefreshCw size={16} aria-hidden="true" />{loading ? 'Loading…' : 'Refresh tickets'}</button>
            <button className="button button-outline button-small" disabled={!records.some((record) => record.status === 'Submitted')}
              onClick={() => downloadFile('requests.csv', '\uFEFF' + requestsCsv(records), 'text/csv;charset=utf-8')}>
              <Download size={16} aria-hidden="true" />Download CSV</button>
          </div>
        </div>
        {records.length === 0
          ? <div className="requests-empty"><span className="empty-icon"><MessageSquarePlus size={30} aria-hidden="true" /></span>
              <h3>What would make your work easier?</h3><p>Open Looper to describe your idea, review the ticket, and prepare its Git brief.</p></div>
          : <div className="request-list">{records.map((record) => <button className="request-row" key={record.id} disabled={pending || saving}
              onClick={() => { lastOpenedId.current = record.id; setActiveId(record.id); setChatError(''); setNotice(''); }}>
              <span className="request-row-icon"><FileText size={20} aria-hidden="true" /></span>
              <span className="request-row-text"><strong>{record.ticket.title || 'Untitled frontend idea'}</strong>
                <span>{record.id} · {isMaster ? `${record.owner.requesterName || record.owner.userId} · ` : ''}Updated {new Date(record.updatedAt).toLocaleDateString()}</span></span>
              <span className={`request-status ${record.handoff === 'ready_for_git' ? 'status-ready' : ''}`}>
                {record.handoff === 'ready_for_git' ? 'Ready for Git' : record.status}</span>
            </button>)}</div>}
      </section>
      <p className="workspace-footnote">Local proof of concept · Frontend feature requests · Human review before implementation</p>
      <button className="looper-launcher" onClick={openLooper} aria-label="Looper" aria-haspopup="dialog"
        aria-controls="looper-dialog" aria-expanded={!!active}>
        <MessageCircle size={24} aria-hidden="true" /><span>Looper</span>
      </button>
      {active && <RequestDrawer key={active.id} request={active} issue={issueMarkdown(active, [...privateValues, active.owner.requesterName || '', active.owner.customerName])}
        pending={pending || saving} readOnly={readOnly} chatError={chatError} saveNotice={storeError || notice || storageError} onClose={() => setActiveId(null)}
        onNewConversation={newRequest}
        onComposer={(value) => { if (!readOnly) update(active.id, (record) => ({ ...record, composer: value, updatedAt: new Date().toISOString() })); }}
        onSend={() => void ask()} onRetry={() => void ask(true)} onEdit={edit}
        onSave={saveRequest} onReady={markReady} />}
    </>
  );
}
