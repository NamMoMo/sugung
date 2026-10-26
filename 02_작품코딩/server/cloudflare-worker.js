import { validateTreasureResult } from '../src/treasure-result.js';

const COOKIE = '__Host-treasure-station', MAX_AGE = 365 * 24 * 60 * 60;
const encoder = new TextEncoder();
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', Vary: 'Cookie', ...headers },
});
const hex = bytes => Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, '0')).join('');
async function signature(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}
async function equal(left, right) {
  const [a, b] = await Promise.all([left, right].map(value => crypto.subtle.digest('SHA-256', encoder.encode(value))));
  const x = new Uint8Array(a), y = new Uint8Array(b); let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
export async function createStationCookie(secret, now = Date.now()) {
  const payload = btoa(JSON.stringify({ expires: now + MAX_AGE * 1000, nonce: crypto.randomUUID() })).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  return `${COOKIE}=${payload}.${await signature(payload, secret)}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Strict`;
}
async function authorized(request, secret) {
  try {
    const value = (request.headers.get('Cookie') || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    const [payload, signed, extra] = (value || '').split('.');
    if (!payload || !/^[a-f0-9]{64}$/.test(signed || '') || extra || !await equal(signed, await signature(payload, secret))) return false;
    const data = JSON.parse(atob(payload.replaceAll('-', '+').replaceAll('_', '/')));
    return Number.isFinite(data.expires) && data.expires > Date.now();
  } catch { return false; }
}

export async function handleStationApi(request, env, upstream = fetch) {
  const url = new URL(request.url), action = url.pathname.replace(/^\/api\/treasure-station\/?/, '').replace(/\/$/, '') || 'state';
  if (request.headers.get('Origin') && request.headers.get('Origin') !== url.origin) return json({ error: '허용되지 않은 요청입니다.' }, 403);
  if (!['state', 'pair', 'save', 'release'].includes(action) || request.method !== (action === 'state' ? 'GET' : 'POST')) return json({ error: '지원하지 않는 요청입니다.' }, 404);
  if (!env.ROOM_SIGNAL_KEY || !env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY || !env.STATION_PAIRING_CODE || !env.STATION_SESSION_SECRET)
    return json({ error: '전시 서버 연결을 준비하고 있습니다.' }, 503);
  try {
    if (action === 'pair') {
      const text = await request.text();
      if (text.length > 1024) return json({ error: '기기 연결 코드를 확인해 주세요.' }, 400);
      const body = JSON.parse(text);
      if (!/^\d{12}$/.test(body.code || '') || !await equal(body.code, env.STATION_PAIRING_CODE))
        return json({ code: 'STATION_PAIRING_REQUIRED', error: '기기 연결 코드를 확인해 주세요.' }, 401);
      return json({ ok: true }, 200, { 'Set-Cookie': await createStationCookie(env.STATION_SESSION_SECRET) });
    }
    if (!await authorized(request, env.STATION_SESSION_SECRET))
      return json({ code: 'STATION_PAIRING_REQUIRED', error: '전시 기기 연결 코드를 입력해 주세요.' }, 401);
    const args = { p_signal_key: env.ROOM_SIGNAL_KEY };
    if (action !== 'state') {
      const text = await request.text();
      if (encoder.encode(text).length > 65536) return json({ error: '올바른 체험 결과를 확인하지 못했습니다.' }, 400);
      const body = JSON.parse(text);
      if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body.visit_id || '') ||
          (action === 'save' && !validateTreasureResult(body.result))) return json({ error: '올바른 체험 결과를 확인하지 못했습니다.' }, 400);
      args.p_visit_id = body.visit_id;
      if (action === 'save') args.p_result = body.result;
    }
    const response = await upstream(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/treasure_station_${action}`, {
      method: 'POST', headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(args), signal: AbortSignal.timeout(12000),
    });
    const data = await response.json();
    if (!response.ok) {
      const code = ['VISIT_STOPPED', 'VISIT_NOT_CURRENT', 'RESULT_REVISION_CONFLICT'].includes(data.message) ? data.message : undefined;
      return json({ code, error: '체험 상태 또는 DB 연결을 확인한 뒤 다시 시도해 주세요.' }, 409);
    }
    return json(data);
  } catch (error) { return json({ error: error instanceof SyntaxError ? '입력한 정보를 확인해 주세요.' : '체험 서버에 연결하지 못했습니다. 다시 시도해 주세요.' }, error instanceof SyntaxError ? 400 : 502); }
}
export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname.startsWith('/api/')) return handleStationApi(request, env);
    return env.ASSETS.fetch(request);
  },
};
