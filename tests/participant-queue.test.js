import test from 'node:test';
import assert from 'node:assert/strict';
import { orderWaiting, queueRequest, resultForSession } from '../src/participant-queue.js';
import { newSession, reduceSession } from '../src/interaction.js';

test('oldest QR entry is first; selected person is removed without changing source', () => {
  const input = [
    { visit_id: 'c', entered_at: '2026-10-26T10:02:00Z' },
    { visit_id: 'b', entered_at: '2026-10-26T10:01:00Z' },
    { visit_id: 'a', entered_at: '2026-10-26T10:00:00Z' },
  ];
  assert.deepEqual(orderWaiting(input, 'b').map(v => v.visit_id), ['a', 'c']);
  assert.equal(input.length, 3);
});
test('equal entry times have deterministic order', () => {
  assert.deepEqual(orderWaiting([{ visit_id: 'b', entered_at: '2026-10-26' }, { visit_id: 'a', entered_at: '2026-10-26' }]).map(v => v.visit_id), ['a', 'b']);
});
test('completion captures actual remaining and own words, not discarded words', () => {
  let state = { ...newSession(), scene: 'main' };
  state = reduceSession(state, { type: 'discard', id: 'initial-0' });
  state = reduceSession(state, { type: 'add', id: 'own', text: '나다움' });
  const result = resultForSession(state);
  assert.equal(result.interaction_count, 2);
  assert(!result.final_keywords.includes('실력'));
  assert.deepEqual(result.added_keywords, ['나다움']);
  assert(!result.remaining_keywords.includes('나다움'));
});
test('station calls carry visit id only, and surface server failure', async () => {
  let sent;
  await queueRequest('claim', { visit_id: 'v1' }, async (url, options) => {
    sent = { url, options }; return { ok: true, json: async () => ({ visit_id: 'v1' }) };
  });
  assert.equal(sent.url, '/api/participant-queue/claim');
  assert.deepEqual(JSON.parse(sent.options.body), { visit_id: 'v1' });
  assert.equal(sent.options.cache, 'no-store');
  await assert.rejects(queueRequest('claim', { visit_id: 'v1' }, async () => ({ ok: false, json: async () => ({ error: 'STATION_BUSY' }) })), /STATION_BUSY/);
});
