import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { create } from 'react-test-renderer';
import { useParticipantQueue } from '../src/useParticipantQueue.js';
import { LIMIT, newSession } from '../src/interaction.js';

async function fixture(initialActive = { visit_id: 'participant-one', nickname: '테스트' }) {
  const original = { fetch: globalThis.fetch, setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval, act: globalThis.IS_REACT_ACT_ENVIRONMENT };
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let poll, queue, renderer, starts = 0, completions = 0, failResponse = false;
  let active = initialActive;
  globalThis.setInterval = fn => { poll = fn; return 1; };
  globalThis.clearInterval = () => {};
  globalThis.fetch = async (url, options) => {
    if (options.method === 'GET') return { ok: true, json: async () => ({ active, waiting: [] }) };
    if (url.endsWith('/complete')) {
      completions++; active = null;
      if (failResponse) return { ok: false, json: async () => ({ error: '저장 응답 유실' }) };
      return { ok: true, json: async () => ({ status: 'completed' }) };
    }
    if (url.endsWith('/release')) { active = null; return { ok: true, json: async () => ({}) }; }
    assert.fail(`Unexpected request: ${url}`);
  };
  function Harness({ session }) {
    queue = useParticipantQueue(() => { starts++; }, session.scene, session);
    return React.createElement('main', { 'data-waiting': queue.show }, session.scene);
  }
  const initial = newSession();
  await act(async () => { renderer = create(React.createElement(Harness, { session: initial })); });
  return {
    get queue() { return queue; }, get starts() { return starts; }, get completions() { return completions; },
    failResponse(value) { failResponse = value; },
    async end(count = LIMIT) { await act(async () => { renderer.update(React.createElement(Harness, { session: { ...initial, scene: 'escaped', count, startedAt: 1000, finishedAt: 10000 } })); }); },
    async poll() { await act(async () => { poll(); }); },
    async next() { active = { visit_id: 'participant-two', nickname: '다음 테스트' }; await this.poll(); },
    async close() {
      await act(async () => { renderer.unmount(); });
      globalThis.fetch = original.fetch; globalThis.setInterval = original.setInterval; globalThis.clearInterval = original.clearInterval;
      if (original.act === undefined) delete globalThis.IS_REACT_ACT_ENVIRONMENT; else globalThis.IS_REACT_ACT_ENVIRONMENT = original.act;
    },
  };
}

test('09 remains visible after successful DB completion and subsequent queue polling', async () => {
  const f = await fixture();
  try {
    assert.equal(f.starts, 1);
    await f.end(); assert.equal(f.completions, 1); assert.equal(f.queue.show, false);
    await f.poll(); await f.poll();
    assert.equal(f.queue.show, false); assert.equal(f.starts, 1);
    assert.equal(f.queue.blocked.current, true);
  } finally { await f.close(); }
});

test('new QR admission exits the held 09 and starts only the new participant', async () => {
  const f = await fixture();
  try {
    await f.end(); await f.next();
    assert.equal(f.starts, 2); assert.equal(f.completions, 1);
    assert.equal(f.queue.show, false); assert.equal(f.queue.blocked.current, false);
  } finally { await f.close(); }
});

test('lost completion response does not hide 09 or lose the selected visit needed for retry', async () => {
  const f = await fixture();
  try {
    f.failResponse(true); await f.end();
    assert.equal(f.queue.completionError, true); assert.equal(f.queue.show, false);
    await f.poll(); assert.equal(f.starts, 1); assert.equal(f.queue.show, false);
    f.failResponse(false); await act(async () => { await f.queue.retryFinish(); });
    assert.equal(f.completions, 2); assert.equal(f.queue.completionError, false); assert.equal(f.queue.show, false);
  } finally { await f.close(); }
});

test('operator test ending remains visible without awarding completion; explicit reset returns to waiting', async () => {
  const f = await fixture();
  try {
    f.queue.valid.current = false; await f.end(0);
    assert.equal(f.completions, 0); assert.equal(f.queue.show, false); assert(f.queue.error);
    await act(async () => { await f.queue.release(); });
    assert.equal(f.queue.show, true); assert.equal(f.completions, 0);
  } finally { await f.close(); }
});

test('empty station has no waiting list or manual selection; QR admission activates it once', async () => {
  const f = await fixture(null);
  try {
    assert.equal(f.starts, 0); assert.equal(f.queue.show, true);
    assert.equal('select' in f.queue, false); assert.equal('waiting' in f.queue.state, false);
    await f.next(); await f.poll();
    assert.equal(f.starts, 1); assert.equal(f.queue.show, false);
    assert.equal(f.queue.blocked.current, false);
  } finally { await f.close(); }
});
