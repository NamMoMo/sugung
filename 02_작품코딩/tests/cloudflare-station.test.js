import test from 'node:test';
import assert from 'node:assert/strict';
import { handleStationApi, createStationCookie } from '../server/cloudflare-worker.js';
import { treasureFixture } from './helpers/treasure-fixture.js';

const env = { ROOM_SIGNAL_KEY: 'private-room-key', SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'public-key', STATION_PAIRING_CODE: '123456789012', STATION_SESSION_SECRET: 'test-session-secret' };
const url = 'https://exhibition.example/api/treasure-station/';
const request = (action = '', body, headers = {}) => new Request(url + action, {
  method: action ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
test('public station requires pairing; correct setup issues a persistent secure HttpOnly cookie', async () => {
  let upstreamCalls = 0;
  const upstream = async () => { upstreamCalls++; return Response.json({ active: null, last: null }); };
  const denied = await handleStationApi(request(), env, upstream);
  assert.equal(denied.status, 401); assert.equal((await denied.json()).code, 'STATION_PAIRING_REQUIRED');
  assert.equal(upstreamCalls, 0);
  assert.equal((await handleStationApi(request('pair', { code: 'wrong' }), env, upstream)).status, 401);
  const paired = await handleStationApi(request('pair', { code: env.STATION_PAIRING_CODE }), env, upstream);
  const cookie = paired.headers.get('Set-Cookie');
  assert.match(cookie, /HttpOnly; Secure; SameSite=Strict/); assert.match(cookie, /Max-Age=31536000/);
  assert(!cookie.includes(env.ROOM_SIGNAL_KEY)); assert(!cookie.includes(env.STATION_PAIRING_CODE));
  const state = await handleStationApi(request('', null, { Cookie: cookie.split(';')[0] }), env, upstream);
  assert.equal(state.status, 200); assert.equal(upstreamCalls, 1);
  assert.equal(state.headers.get('Cache-Control'), 'no-store');
});
test('forged/expired cookies and external origins cannot read or mutate the station', async () => {
  const expired = await createStationCookie(env.STATION_SESSION_SECRET, Date.now() - 366 * 86400000);
  const forged = await createStationCookie('wrong-secret');
  for (const cookie of [expired, forged, '__Host-treasure-station=invalid'])
    assert.equal((await handleStationApi(request('', null, { Cookie: cookie }), env)).status, 401);
  assert.equal((await handleStationApi(request('pair', { code: env.STATION_PAIRING_CODE }, { Origin: 'https://outside.example' }), env)).status, 403);
});
test('paired cloud requests preserve result validation and never disclose server credentials', async () => {
  const cookie = (await createStationCookie(env.STATION_SESSION_SECRET)).split(';')[0];
  const payload = { visit_id: '00000000-0000-0000-0000-000000000001', result: treasureFixture().initial };
  let sent;
  const upstream = async (url, options) => { sent = { url, body: JSON.parse(options.body) }; return Response.json({ visit_id: payload.visit_id, status: 'completed', saved_revision: 6 }); };
  const saved = await handleStationApi(request('save', payload, { Cookie: cookie }), env, upstream);
  assert.equal(saved.status, 200); assert.equal(sent.body.p_signal_key, env.ROOM_SIGNAL_KEY);
  assert(!JSON.stringify(await saved.json()).includes(env.ROOM_SIGNAL_KEY));
  payload.result.selections[0].action = '위조';
  assert.equal((await handleStationApi(request('save', payload, { Cookie: cookie }), env, upstream)).status, 400);
  assert.equal((await handleStationApi(request('claim', {}), env, upstream)).status, 404);
});
