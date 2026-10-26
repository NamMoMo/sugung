import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { queuePlugin } from '../server/queue-plugin.js';
import { resultForSession } from '../src/participant-queue.js';
import { newSession, reduceSession } from '../src/interaction.js';

test('local bridge keeps the room key on server and rejects external origins and oversized requests', async () => {
  const original = { key: process.env.ROOM_SIGNAL_KEY, url: process.env.SUPABASE_URL, publicKey: process.env.SUPABASE_PUBLISHABLE_KEY, fetch: globalThis.fetch };
  process.env.ROOM_SIGNAL_KEY = 'test-only-private-key';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'test-public-key';
  let upstream;
  globalThis.fetch = async (url, options) => {
    upstream = { url, options }; return { ok: true, json: async () => ({ visit_id: '00000000-0000-0000-0000-000000000001' }) };
  };
  try {
    let middleware;
    const plugin = queuePlugin();
    plugin.configResolved({ mode: 'test', root: process.cwd() });
    plugin.configurePreviewServer({ middlewares: { use: (path, callback) => { middleware = callback; } } });
    async function request(url, method = 'GET', body = '', extra = {}) {
      const req = Readable.from([body]);
      Object.assign(req, { url, method, headers: { host: '127.0.0.1:4173', ...extra } });
      const headers = {};
      return new Promise((resolve, reject) => {
        const res = { statusCode: 200, setHeader: (k, v) => { headers[k] = v; }, end: text => resolve({ status: res.statusCode, body: JSON.parse(text), headers }) };
        Promise.resolve(middleware(req, res)).catch(reject);
      });
    }
    const claimed = await request('/release', 'POST', JSON.stringify({ visit_id: '00000000-0000-0000-0000-000000000001', p_signal_key: 'forged' }));
    assert.equal(claimed.status, 200);
    assert.equal(JSON.parse(upstream.options.body).p_signal_key, 'test-only-private-key');
    assert(!JSON.stringify(claimed).includes('test-only-private-key'));
    assert.equal(claimed.headers['Cache-Control'], 'no-store');
    let session = reduceSession(newSession(), { type: 'next', at: 1000 });
    session = reduceSession({ ...session, scene: 'main' }, { type: 'discard', id: 'initial-0', at: 2000 });
    session = reduceSession(session, { type: 'add', id: 'mine', text: '나다움', at: 3000 });
    const result = resultForSession({ ...session, finishedAt: 5000 });
    const saved = await request('/complete', 'POST', JSON.stringify({ visit_id: '00000000-0000-0000-0000-000000000001', result }));
    assert.equal(saved.status, 200);
    assert(upstream.url.endsWith('/beliefs_queue_complete'));
    assert.deepEqual(JSON.parse(upstream.options.body).p_result, result);
    assert.equal(JSON.parse(upstream.options.body).p_result.duration_ms, 4000);
    assert.deepEqual(JSON.parse(upstream.options.body).p_result.discarded_initial_keywords, ['실력']);
    assert.equal((await request('/', 'GET', '', { origin: 'https://example.org' })).status, 403);
    assert.equal((await request('/', 'GET', '', { host: 'example.org:4173' })).status, 403);
    assert.equal((await request('/release', 'POST', 'x'.repeat(65537))).status, 502);
    assert.equal((await request('/release', 'POST', '{bad json')).status, 502);
    assert.equal((await request('/claim', 'POST', '{}')).status, 404);
    globalThis.fetch = async () => ({ ok: false });
    const failed = await request('/');
    assert.equal(failed.status, 409);
    assert(!JSON.stringify(failed).includes('test-only-private-key'));
  } finally {
    globalThis.fetch = original.fetch;
    for (const [name, value] of [['ROOM_SIGNAL_KEY', original.key], ['SUPABASE_URL', original.url], ['SUPABASE_PUBLISHABLE_KEY', original.publicKey]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
