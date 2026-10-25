import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAppBridge } from '../main/app-bridge-server.js';
import worker from '../main/_worker.js';

const token = 'a'.repeat(64);
const record = { nickname: '앱에서 가져온 긴 닉네임', kept: { item: '산책하기' }, lanternColor: '금빛·초록', finishedAt: 123 };
function fixture(overrides = {}) {
  const stored = new Map(); const calls = [];
  const context = { visit_id: 'visit-1', participant_code: 'SG-000000000001',
    nickname: '원래 이름', items: ['산책하기', '물 마시기'], status: 'active', ...overrides };
  const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'public', ROOM_SIGNAL_KEY: 'private',
    ROOMB: { async put(k, v) { stored.set(k, JSON.parse(v)); } } };
  const rpc = async (_, name, args) => {
    calls.push({ name, args });
    if (name === 'resolve_lantern_launch') return { ...context };
    if (context.status === 'active') { context.result = args.p_result; context.status = 'completed'; }
    return { visit_id: context.visit_id, status: 'completed', completed_at: '2026-10-24T00:00:00Z' };
  };
  const request = (action, body = {}) => new Request(`https://room.example/api/app/${action}`, {
    method: 'POST', body: JSON.stringify({ token, ...body }),
  });
  return { env, rpc, stored, context, calls, request };
}
test('launch prefills nickname without returning private keys or previous result', async () => {
  const f = fixture(); const body = await (await handleAppBridge(f.request('launch'), f.env, f.rpc)).json();
  assert.equal(body.nickname, '원래 이름'); assert.equal(body.ready, true);
  assert.equal(body.result, undefined); assert.equal(JSON.stringify(body).includes('private'), false);
});
test('unmapped room 3 result blocks completion and does not fabricate items', async () => {
  const f = fixture({ items: null });
  assert.equal((await (await handleAppBridge(f.request('launch'), f.env, f.rpc)).json()).ready, false);
  assert.equal((await handleAppBridge(f.request('complete', { record }), f.env, f.rpc)).status, 409);
  assert.equal(f.stored.size, 0); assert.equal(f.calls.some(c => c.name === 'complete_room_visit'), false);
});
test('completion is saved before projection and retries retain the first nickname and item', async () => {
  const f = fixture();
  assert.equal((await handleAppBridge(f.request('complete', { record }), f.env, f.rpc)).status, 200);
  assert.equal((await handleAppBridge(f.request('complete', { record: { ...record, nickname: 'changed' } }), f.env, f.rpc)).status, 200);
  assert.equal(f.stored.size, 1); assert.equal(f.stored.get('app-feed:visit-1').nickname, record.nickname);
  assert.equal(f.context.nickname, '원래 이름');
});
test('KV failure can be retried after DB completion', async () => {
  const f = fixture(); const kv = f.env.ROOMB;
  f.env.ROOMB = { async put() { throw new Error('offline'); } };
  assert.equal((await handleAppBridge(f.request('complete', { record }), f.env, f.rpc)).status, 502);
  assert.equal(f.context.status, 'completed');
  f.env.ROOMB = kv;
  assert.equal((await handleAppBridge(f.request('complete', { record }), f.env, f.rpc)).status, 200);
  assert.equal(f.stored.size, 1);
});
test('unavailable Supabase never creates a projection or reports completion', async () => {
  const f = fixture();
  const res = await handleAppBridge(f.request('complete', { record }), f.env, async () => { throw new Error('offline'); });
  assert.equal(res.status, 502); assert.equal(f.stored.size, 0);
});
test('forged selection, stopped visits, invalid tickets and cross-origin calls are rejected', async () => {
  const f = fixture();
  assert.equal((await handleAppBridge(f.request('complete', { record: { ...record, kept: { item: '임의 항목' } } }), f.env, f.rpc)).status, 400);
  assert.equal((await handleAppBridge(f.request('launch', { token: '0417' }), f.env, f.rpc)).status, 400);
  f.context.status = 'stopped';
  assert.equal((await handleAppBridge(f.request('launch'), f.env, f.rpc)).status, 403);
  const req = f.request('launch'); req.headers.set('origin','https://other.example');
  assert.equal((await handleAppBridge(req, f.env, f.rpc)).status, 403);
});
test('two participants completing concurrently create independent projection records', async () => {
  const a = fixture(), b = fixture({ visit_id: 'visit-2', participant_code: 'SG-000000000002' });
  b.env.ROOMB = a.env.ROOMB;
  const results = await Promise.all([a, b].map(f => handleAppBridge(f.request('complete', { record }), f.env, f.rpc)));
  assert.deepEqual(results.map(r => r.status), [200,200]); assert.equal(a.stored.size, 2);
});

test('actual Worker feed includes delayed app entries older than the legacy timestamp cursor', async () => {
  const app = { k: 'app/visit-1', at: 10, nickname: '토끼', item: '산책하기' };
  const kv = {
    async get(key) { return key === 'feed' ? [{ k: 'old', at: 20 }] : app; },
    async list() { return { keys: [{ name: 'app-feed:visit-1' }], list_complete: true }; },
  };
  const response = await worker.fetch(new Request('https://room.example/api/feed?after=100'), { ROOMB: kv }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.items.map(i => i.k), ['app/visit-1']);
});

test('deployed health route checks the real room key and KV without returning participant or secret data', async () => {
  const f = fixture(); let args;
  f.env.ROOMB.get = async key => { assert.equal(key, '__sugung_bridge_health__'); return null; };
  const response = await handleAppBridge(new Request('https://room.example/api/app/health'), f.env, async (_, name, body) => {
    assert.equal(name, 'get_room_waiting_visits'); args = body; return [];
  });
  assert.equal(response.status, 200);
  assert.equal(args.p_participant_code, 'health-check:no-participant');
  assert.deepEqual(await response.json(), { ok: true, supabase: true, kv: true, room: 'lantern-dream' });
});

test('health never reports success for missing config or an invalid Supabase room key', async () => {
  const f = fixture();
  const request = () => new Request('https://room.example/api/app/health');
  assert.equal((await handleAppBridge(request(), {}, f.rpc)).status, 503);
  const response = await handleAppBridge(request(), f.env, async () => { throw new Error('private room key'); });
  assert.equal(response.status, 502); assert.doesNotMatch(await response.text(), /private room key/);
});

test('legacy participant API retains its original six-letter nickname limit', async () => {
  const response = await worker.fetch(new Request('https://room.example/api/participants/0417/roomB', {
    method: 'POST', body: JSON.stringify({ nickname: '1234567', kept: { item: '산책하기' } }),
  }), { ROOMB: {} }, { waitUntil() {} });
  assert.equal(response.status, 400);
});
