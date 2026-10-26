import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { stationPlugin } from '../server/station-plugin.js';
import { treasureFixture } from './helpers/treasure-fixture.js';

test('local server validates complete results, scopes the secret and rejects external/manual/oversized requests', async () => {
  const names = ['ROOM_SIGNAL_KEY', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'];
  const previous = names.map(name => process.env[name]), oldFetch = globalThis.fetch;
  [process.env.ROOM_SIGNAL_KEY, process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY] = ['test-room-secret', 'https://example.supabase.co', 'test-public'];
  let upstream, middleware;
  globalThis.fetch = async (url, options) => {
    upstream = { url, body: JSON.parse(options.body) };
    return { ok: true, json: async () => ({ visit_id: upstream.body.p_visit_id, status: 'completed', saved_revision: 6 }) };
  };
  try {
    const plugin = stationPlugin(); plugin.configResolved({ mode: 'test', root: process.cwd() });
    plugin.configurePreviewServer({ middlewares: { use: (_, handler) => { middleware = handler; } } });
    async function request(url, body = '', headers = {}, method = 'POST') {
      const req = Object.assign(Readable.from([body]), { url, method, headers: { host: '127.0.0.1:4176', ...headers } });
      return new Promise((resolve, reject) => {
        const res = { statusCode: 200, setHeader() {}, end(text) { resolve({ status: res.statusCode, body: JSON.parse(text) }); } };
        Promise.resolve(middleware(req, res)).catch(reject);
      });
    }
    const payload = { visit_id: '00000000-0000-0000-0000-000000000001', result: treasureFixture().initial, p_signal_key: 'forged' };
    const saved = await request('/save', JSON.stringify(payload));
    assert.equal(saved.status, 200); assert.equal(upstream.body.p_signal_key, 'test-room-secret');
    assert(upstream.url.endsWith('/treasure_station_save')); assert(!JSON.stringify(saved).includes('test-room-secret'));
    const invalid = structuredClone(payload); invalid.result.selections[0].action = '위조';
    assert.equal((await request('/save', JSON.stringify(invalid))).status, 400);
    assert.equal((await request('/save', JSON.stringify(payload), { origin: 'https://outside.example' })).status, 403);
    assert.equal((await request('/save', JSON.stringify(payload), { host: 'example.org' })).status, 403);
    assert.equal((await request('/save', 'x'.repeat(65537))).status, 400);
    assert.equal((await request('/claim', '{}')).status, 404);
    globalThis.fetch = async () => ({ ok: false, json: async () => ({ message: 'VISIT_STOPPED', details: 'private upstream detail' }) });
    const denied = await request('/save', JSON.stringify(payload));
    assert.equal(denied.body.code, 'VISIT_STOPPED'); assert(!JSON.stringify(denied).includes('private upstream detail'));
  } finally {
    globalThis.fetch = oldFetch;
    names.forEach((name, index) => { if (previous[index] === undefined) delete process.env[name]; else process.env[name] = previous[index]; });
  }
});
