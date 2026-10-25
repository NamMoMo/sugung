import test from 'node:test';
import assert from 'node:assert/strict';
import { orderWaiting, queueRequest, resultForSession, selectionChanged } from '../src/participant-queue.js';
import { newSession, reduceSession } from '../src/interaction.js';

test('display starts only a selected participant and does not restart on repeated polling', () => {
  assert.deepEqual(selectionChanged(null, null), { start: false, stop: false });
  assert.deepEqual(selectionChanged(null, { visit_id: 'one' }), { start: true, stop: false });
  assert.deepEqual(selectionChanged('one', { visit_id: 'one' }), { start: false, stop: false });
  assert.deepEqual(selectionChanged('one', null), { start: false, stop: true });
  assert.deepEqual(selectionChanged('one', { visit_id: 'two' }), { start: true, stop: true });
});

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

test('saved result preserves additions later discarded, repeated words, ordered actions and frozen duration', () => {
  let state = reduceSession(newSession(), { type: 'next', at: 1000 });
  state = { ...state, scene: 'main' };
  state = reduceSession(state, { type: 'discard', id: 'initial-0', at: 2000 });
  state = reduceSession(state, { type: 'add', id: 'mine-1', text: '여유', at: 3000 });
  state = reduceSession(state, { type: 'discard', id: 'mine-1', at: 4000 });
  state = reduceSession(state, { type: 'add', id: 'mine-2', text: '여유', at: 5000 });
  for (let i = 0; i < 6; i++) state = reduceSession(state, { type: 'add', id: `extra-${i}`, text: '성장', at: 6000 + i });
  while (state.scene !== 'escaped') state = reduceSession(state, { type: 'next', at: 12000 });
  const result = resultForSession(state);
  assert.equal(result.schema_version, 2);
  assert.equal(result.room_id, 'beliefs');
  assert.equal(result.team_id, 1);
  assert.equal(result.duration_ms, 11000);
  assert.deepEqual(result.discarded_initial_keywords, ['실력']);
  assert.deepEqual(result.discarded_keywords, ['실력', '여유']);
  assert.equal(result.all_added_keywords.filter(s => s === '여유').length, 2);
  assert.equal(result.added_keywords.filter(s => s === '여유').length, 1);
  assert.equal(result.history.length, 10);
  assert.deepEqual(result.history.map(e => e.sequence), [1,2,3,4,5,6,7,8,9,10]);
  assert.equal(result.history[0].elapsed_ms, 1000);
  assert.equal(result.history[2].source, 'participant');
  assert.deepEqual(resultForSession(reduceSession(state, { type: 'next', at: 99999 })), result);
  assert.equal(new TextEncoder().encode(JSON.stringify(result)).length < 65536, true);
  const reset = reduceSession(state, { type: 'reset' });
  assert.deepEqual(reset.history, []);
  assert.equal(reset.startedAt, null);
  assert.equal(reset.finishedAt, null);
});

test('ignored actions never create result history', () => {
  const waiting = newSession();
  assert.equal(reduceSession(waiting, { type: 'add', id: 'no', text: '입력' }), waiting);
  const main = { ...waiting, scene: 'main' };
  assert.equal(reduceSession(main, { type: 'discard', id: 'unknown' }), main);
  assert.equal(reduceSession(main, { type: 'add', id: 'blank', text: '   ' }), main);
  assert.deepEqual(main.history, []);
  assert.equal(resultForSession(main).duration_ms, null);
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
