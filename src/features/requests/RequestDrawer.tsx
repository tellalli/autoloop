import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, Copy, Download, MessageSquarePlus, Send, X } from 'lucide-react';
import { TICKET_FIELDS, missingFields, type TicketField, type TicketRequest } from './model';
import { downloadFile } from './exports';

interface Props {
  request: TicketRequest;
  issue: string;
  pending: boolean;
  readOnly?: boolean;
  chatError: string;
  saveNotice: string;
  onClose: () => void;
  onNewConversation: () => void;
  onComposer: (value: string) => void;
  onSend: () => void;
  onRetry: () => void;
  onEdit: (field: TicketField, value: string) => void;
  onSave: () => Promise<boolean>;
  onReady: () => void;
}

export function RequestDrawer(props: Props) {
  const { request, pending } = props;
  const dialog = useRef<HTMLDialogElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'chat' | 'ticket' | 'git'>('chat');
  const [reviewed, setReviewed] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const missing = missingFields(request.ticket);

  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element?.showModal();
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [request.messages, pending, tab]);

  useEffect(() => { setReviewed(false); setCopyStatus(''); }, [props.issue]);

  async function copyIssue() {
    try { await navigator.clipboard.writeText(props.issue); setCopyStatus('Copied.'); }
    catch { setCopyStatus('Copy is unavailable. Download the Markdown file instead.'); }
  }

  function send(event: FormEvent) { event.preventDefault(); props.onSend(); }

  return (
    <dialog ref={dialog} id="looper-dialog" className="request-drawer" aria-labelledby="request-dialog-title"
      onCancel={(event) => { event.preventDefault(); props.onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) props.onClose(); }}>
      <div className="drawer-shell">
        <header className="drawer-header">
          <div><p className="eyebrow">Looper · {request.id} · Revision {request.revision}</p>
            <h2 id="request-dialog-title">{request.ticket.title || 'A new idea starts here'}</h2></div>
          <div className="drawer-header-actions">
            <button className="button button-outline button-small" onClick={props.onNewConversation} disabled={pending} aria-label="New conversation">
              <MessageSquarePlus size={18} aria-hidden="true" /><span className="drawer-new-label">New conversation</span>
            </button>
            <button className="icon-button" onClick={props.onClose} aria-label="Close request"><X size={22} /></button>
          </div>
        </header>
        <div className="request-tabs" role="tablist" aria-label="Request capture">
          {([['chat', 'Conversation'], ['ticket', 'Ticket'], ['git', 'Git brief']] as const).map(([value, label]) => (
            <button key={value} id={`tab-${value}`} role="tab" aria-selected={tab === value} tabIndex={tab === value ? 0 : -1}
              onKeyDown={(event) => {
                const tabs = ['chat', 'ticket', 'git'] as const;
                const position = tabs.indexOf(tab);
                const next = event.key === 'ArrowRight' ? tabs[(position + 1) % 3]
                  : event.key === 'ArrowLeft' ? tabs[(position + 2) % 3]
                  : event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[2] : null;
                if (next) { event.preventDefault(); setTab(next); document.getElementById(`tab-${next}`)?.focus(); }
              }}
              aria-controls={`panel-${value}`} onClick={() => setTab(value)}>{label}</button>
          ))}
        </div>
        <p id="request-stage-help" className="workflow-note">
          {tab === 'chat' ? 'Describe your idea to Looper. Review the draft in Ticket when you are ready.'
            : tab === 'ticket' ? 'Confirm the details to save your ticket and move to Git brief review.'
            : 'Review the issue draft, then mark it ready to copy or download for GitHub.'}
        </p>
        <section id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} aria-describedby="request-stage-help" className={`drawer-panel panel-${tab}`}>
          {tab === 'chat' && <>
            <div ref={log} className="conversation" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text">
              {request.messages.map((message) => <article key={message.id} className={`message message-${message.role}`}>
                <span className="message-author">{message.role === 'user' ? props.readOnly ? 'Requester' : 'You' : 'Looper'}</span>
                <p>{message.content}</p>
              </article>)}
              {pending && <p className="chat-working" role="status">Thinking through your request…</p>}
            </div>
            {props.chatError && <div className="chat-error"><p className="error" role="alert">{props.chatError}</p>
              <button className="text-button" onClick={props.onRetry} disabled={pending}>Retry response</button></div>}
            {props.readOnly ? <p className="workflow-note">Viewing another user's ticket. Only its requester can edit or continue this conversation.</p> : <form className="chat-composer" onSubmit={send}>
              <label className="sr-only" htmlFor="request-message">Message</label>
              <div className="composer-row">
                <textarea id="request-message" rows={3} maxLength={4000} value={request.composer}
                  placeholder="Describe the frontend change you have in mind…" disabled={pending}
                  aria-describedby="request-message-hint"
                  onChange={(event) => props.onComposer(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault(); if (request.composer.trim() && !pending) props.onSend();
                    }
                  }} />
                <button className="button button-small" type="submit" disabled={!request.composer.trim() || pending}>
                  <Send size={16} aria-hidden="true" />{pending ? 'Sending…' : 'Send'}
                </button>
              </div>
              <p id="request-message-hint" className="composer-hint">Enter to send · Shift+Enter for a new line</p>
            </form>}
          </>}
          {tab === 'ticket' && <div className="ticket-editor">
            <div className="ticket-intro"><p>Review what you want to change. You can edit every field before confirming.</p>
              <span className={`scope-badge scope-${request.ticket.scopeAssessment}`}>
                {request.ticket.scopeAssessment === 'frontend' ? 'Frontend scope' : request.ticket.scopeAssessment === 'out_of_scope' ? 'Outside current scope' : 'Needs scope review'}
              </span></div>
            {TICKET_FIELDS.map(([key, label]) => <div className="field" key={key}>
              <label htmlFor={`ticket-${key}`}>{label}</label>
              {key === 'title'
                ? <input id={`ticket-${key}`} value={request.ticket[key]} maxLength={200} disabled={pending || props.readOnly}
                    onChange={(event) => props.onEdit(key, event.target.value)} />
                : <textarea id={`ticket-${key}`} value={request.ticket[key]} rows={3} maxLength={8000} disabled={pending || props.readOnly}
                    onChange={(event) => props.onEdit(key, event.target.value)} />}
            </div>)}
            {!!missing.length && <p className="field-hint">Before saving, complete: {missing.join(', ')}.</p>}
            <p className="field-hint">Confirming saves your request for review. It does not approve a build or promise delivery.</p>
          </div>}
          {tab === 'git' && <div className="git-brief">
            {request.status !== 'Submitted'
              ? <div className="brief-empty"><h3>Confirm your ticket first</h3><p className="muted">Review and save the ticket, then prepare its issue draft here.</p>
                  <button className="button button-small" onClick={() => setTab('ticket')}>Review ticket</button></div>
              : <>
                <p className="muted">This Markdown issue draft is generated from your confirmed ticket. Review it before sharing.</p>
                <details className="brief-explainer">
                  <summary>What goes into the Git brief?</summary>
                  <p>The brief gives a reviewer the problem, current and desired behavior, frontend scope, acceptance criteria, data needs, dependencies, assumptions, and open questions. Its request ID and revision link it to the confirmed ticket.</p>
                  <p>Unknowns remain questions for scoping. Your account details and private conversation are excluded. Marking it ready prepares the handoff; it does not create an issue or approve implementation.</p>
                </details>
                <pre tabIndex={0} aria-label="GitHub issue draft">{props.issue}</pre>
                {request.handoff !== 'ready_for_git' && !props.readOnly && <>
                  <label className="review-check"><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />
                    <span>I reviewed the scope, open questions, and content for private information.</span></label>
                  {request.ticket.scopeAssessment === 'out_of_scope' && <p className="error">Narrow the ticket to frontend work before marking it ready.</p>}
                  <button className="button" disabled={!reviewed || pending || request.ticket.scopeAssessment === 'out_of_scope'} onClick={props.onReady}>
                    <Check size={18} aria-hidden="true" />Mark ready for Git
                  </button>
                </>}
                {(request.handoff === 'ready_for_git' || props.readOnly) && <>
                  {request.handoff === 'ready_for_git' && <p className="ready-note"><Check size={18} aria-hidden="true" />Ready for human triage and GitHub submission</p>}
                  <div className="brief-actions">
                    <button className="button button-outline" onClick={copyIssue}><Copy size={16} aria-hidden="true" />Copy brief</button>
                    <button className="button" onClick={() => downloadFile(`${request.id}.md`, props.issue, 'text/markdown;charset=utf-8')}>
                      <Download size={16} aria-hidden="true" />Download Markdown</button>
                  </div>
                  {copyStatus && <p role="status" className="field-hint">{copyStatus}</p>}
                </>}
                <p className="field-hint">No issue has been created. GitHub submission and implementation approval remain human actions.</p>
              </>}
          </div>}
        </section>
        {props.saveNotice && <p className="drawer-save-notice" role="status">{props.saveNotice}</p>}
        <footer className="drawer-footer"><span className="field-hint">{request.status === 'Draft' ? 'Draft · review before submitting' : 'Submitted'}</span>
          {tab === 'chat' && <button className="button" onClick={() => setTab('ticket')}>Review ticket</button>}
          {tab === 'ticket' && !props.readOnly && (request.status === 'Submitted'
            ? <button className="button" onClick={() => setTab('git')}>Review Git brief</button>
            : <button className="button" disabled={!!missing.length || pending}
                onClick={async () => { if (await props.onSave()) setTab('git'); }}>Confirm and save request</button>)}
        </footer>
      </div>
    </dialog>
  );
}
