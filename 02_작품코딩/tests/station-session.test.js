import test from 'node:test';
import assert from 'node:assert/strict';
import { createStationSession } from '../src/station-session.js';
import { treasureFixture } from './helpers/treasure-fixture.js';

const drain = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
test('cloud pairing is required before activation; successful pairing resumes the existing admission flow', async () => {
  let paired = false, starts = 0;
  const session = createStationSession({ onActivate: () => starts++, async request(action, body) {
    if (action === 'pair') { assert.equal(body.code, '123456789012'); paired = true; return { ok: true }; }
    if (!paired) throw Object.assign(new Error('기기 연결 필요'), { code: 'STATION_PAIRING_REQUIRED' });
    return { active: { visit_id: 'one' } };
  } });
  await session.sync(); assert.equal(session.state.pairingRequired, true); assert.equal(starts, 0);
  await session.pair('123456789012'); assert.equal(session.state.pairingRequired, false); assert.equal(starts, 1);
});
function setup() {
  let active = { visit_id: 'one', nickname: '점검' }, last = active, starts = 0, resets = 0, saved = 0;
  let saveHandler;
  const calls = [], states = [];
  const session = createStationSession({
    onChange: state => states.push({ ...state }), onActivate: () => starts++, onReset: () => resets++,
    async request(action = 'state', body) {
      calls.push({ action, body: structuredClone(body) });
      if (action === 'state') return { active, last };
      if (action === 'release') { active = null; last = null; return {}; }
      if (saveHandler) return saveHandler(body);
      saved = Math.max(saved, body.result.revision); active = null; last = { visit_id: body.visit_id, status: 'completed' };
      return { visit_id: body.visit_id, status: 'completed', saved_revision: saved };
    },
  });
  return { session, calls, states, get starts() { return starts; }, get resets() { return resets; },
    active(value, status) { active = value; last = value || (status ? { visit_id: 'one', status } : null); },
    save(fn) { saveHandler = fn; },
  };
}
test('QR admission starts once; mobile stop resets; a different participant starts a new run', async () => {
  const f = setup(); await f.session.sync(); await f.session.sync();
  assert.equal(f.starts, 1); assert.equal(f.session.state.active, true);
  f.active(null, 'stopped'); await f.session.sync(); assert.equal(f.resets, 1); assert.equal(f.session.state.active, false);
  f.active({ visit_id: 'two' }); await f.session.sync(); assert.equal(f.starts, 2);
});
test('completion holds the original result screen; edits save as newer revisions and polling cannot reset it', async () => {
  const f = setup(), result = treasureFixture(); await f.session.sync();
  f.session.submit(result.initial); await drain(); await f.session.sync();
  assert.equal(f.session.state.completed, true); assert.equal(f.resets, 0); assert.equal(f.session.state.active, true);
  f.session.submit(result.change()); await drain(); f.session.submit(result.initial); await drain();
  assert.deepEqual(f.calls.filter(c => c.action === 'save').map(c => c.body.result.revision), [6, 7]);
  f.active({ visit_id: 'two' }); await f.session.sync(); assert.equal(f.starts, 2); assert.equal(f.session.state.completed, false);
});
test('an edit while saving is serialized after the first result without losing it', async () => {
  const f = setup(), result = treasureFixture(); await f.session.sync(); let resolve;
  f.save(() => new Promise(done => { resolve = done; }));
  f.session.submit(result.initial); f.session.submit(result.change()); await drain();
  assert.equal(f.calls.filter(c => c.action === 'save').length, 1);
  f.save(undefined); resolve({ visit_id: 'one', status: 'completed', saved_revision: 6 }); await drain();
  assert.deepEqual(f.calls.filter(c => c.action === 'save').map(c => c.body.result.revision), [6, 7]);
  assert.equal(f.session.state.busy, false);
});
test('lost save response preserves a stable retry payload even after DB says completed', async () => {
  const f = setup(), result = treasureFixture(); await f.session.sync();
  f.save(async () => { f.active(null, 'completed'); throw new Error('연결 끊김'); });
  f.session.submit(result.initial); await drain(); await f.session.sync();
  assert.equal(f.resets, 0); assert.equal(f.session.state.active, true); assert.match(f.session.state.error, /연결/);
  f.save(undefined); await f.session.retry();
  const saves = f.calls.filter(c => c.action === 'save'); assert.deepEqual(saves[0].body, saves[1].body);
  assert.equal(f.session.state.completed, true);
});
test('next visitor waits for saving before releasing; stopped saves never award completion', async () => {
  const f = setup(); await f.session.sync(); let resolve;
  f.save(() => new Promise(done => { resolve = done; }));
  f.session.submit(treasureFixture().initial); await f.session.reset();
  assert.equal(f.calls.some(c => c.action === 'release'), false);
  resolve({ visit_id: 'one', status: 'completed', saved_revision: 6 }); await drain();
  assert.equal(f.calls.at(-1).action, 'release'); assert.equal(f.resets, 1);
  const g = setup(); await g.session.sync();
  g.save(async () => { throw Object.assign(new Error('중지'), { code: 'VISIT_STOPPED' }); });
  g.session.submit(treasureFixture().initial); await drain();
  assert.equal(g.session.state.active, false); assert.equal(g.session.state.completed, false); assert.equal(g.resets, 1);
});
test('read failures never enable anonymous play; a disposed read cannot activate a visitor', async () => {
  const f = createStationSession({ request: async () => { throw new Error('설정 필요'); } });
  await f.sync(); assert.equal(f.state.active, false); assert.equal(f.state.ready, false);
  let resolve, starts = 0;
  const g = createStationSession({ request: () => new Promise(done => { resolve = done; }), onActivate: () => starts++ });
  const reading = g.sync(); g.dispose(); resolve({ active: { visit_id: 'late' } }); await reading;
  assert.equal(starts, 0);
});
