import { isChatReply, isObject, TICKET_FIELDS, type ChatReply, type Ticket } from '../src/features/requests/model';

export class ChatResponseError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}

// JSON mode ensures JSON syntax, not our application schema. Accept harmless
// partial updates/list formatting without inventing fields or dropping prior work.
export function parseChatResponse(content: string, previous: Ticket): ChatReply {
  if (!content.trim()) throw new ChatResponseError('model_response_empty', 'DeepSeek returned an empty reply.');
  const trimmed = content.trim();
  const json = trimmed.startsWith('```') ? trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '') : trimmed;
  let value: unknown;
  try { value = JSON.parse(json); }
  catch { throw new ChatResponseError('model_response_invalid_json', 'DeepSeek returned a reply that was not valid JSON.'); }
  if (!isObject(value) || typeof value.reply !== 'string' || !value.reply.trim() || value.reply.length > 12000) {
    throw new ChatResponseError('model_response_invalid_reply', 'DeepSeek did not return a usable conversation reply.');
  }
  if (value.ticket != null && !isObject(value.ticket)) {
    throw new ChatResponseError('model_response_invalid_ticket', 'DeepSeek returned an invalid ticket update.');
  }
  const update = isObject(value.ticket) ? value.ticket : {};
  const fields = Object.fromEntries(TICKET_FIELDS.map(([key]) => {
    const next = update[key];
    if (next == null) return [key, previous[key]];
    if (typeof next === 'string') return [key, next];
    if (Array.isArray(next) && next.every((item) => typeof item === 'string')) return [key, next.join('\n')];
    throw new ChatResponseError('model_response_invalid_ticket', `DeepSeek returned an invalid ${key} field.`);
  }));
  const scope = update.scopeAssessment ?? previous.scopeAssessment;
  const result = { reply: value.reply, ticket: { ...fields, scopeAssessment: scope } };
  if (!isChatReply(result)) throw new ChatResponseError('model_response_invalid_ticket', 'DeepSeek returned ticket fields outside the supported format.');
  return result;
}
