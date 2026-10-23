// Supabase remains authoritative. KV contains only the projection feed.
const reply = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});
const tokenPattern = /^[a-f0-9]{64}$/;

export async function handleAppBridge(request, env, rpc = callRpc) {
  const path = new URL(request.url).pathname;
  if (!['/api/app/launch', '/api/app/complete'].includes(path)) return null;
  if (request.method !== 'POST') return reply({ error: 'METHOD_NOT_ALLOWED' }, 405);
  if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin)
    return reply({ error: 'ORIGIN_MISMATCH' }, 403);
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY || !env.ROOM_SIGNAL_KEY || !env.ROOMB)
    return reply({ error: 'BRIDGE_NOT_CONFIGURED' }, 503);
  try {
    const text = await request.text();
    if (text.length > 32000) return reply({ error: 'TOO_LARGE' }, 413);
    const body = JSON.parse(text);
    if (!tokenPattern.test(body.token || '')) return reply({ error: 'INVALID_LAUNCH' }, 400);
    const context = await rpc(env, 'resolve_lantern_launch', { p_token: body.token, p_signal_key: env.ROOM_SIGNAL_KEY });
    if (!context?.visit_id || !['active','completed'].includes(context.status)) return reply({ error: 'INVALID_LAUNCH' }, 403);
    if (path.endsWith('/launch')) return reply({ ...context, result: undefined,
      ready: Array.isArray(context.items) && context.items.length >= 2 && context.items.length <= 9 });
    const items = context.items;
    if (!Array.isArray(items) || items.length < 2 || items.length > 9)
      return reply({ error: 'ROOM3_RESULT_PENDING' }, 409);
    const r = body.record;
    if (!r || !items.includes(r.kept?.item) || typeof r.nickname !== 'string' || !r.nickname.trim() ||
        r.nickname.trim().length > 40 || /[\u0000-\u001f\u007f]/.test(r.nickname))
      return reply({ error: 'INVALID_RESULT' }, 400);
    // Completed retries always use the first saved result, even if the payload changes.
    let result = context.status === 'completed' ? context.result : {
      schema_version: 1, source: 'lantern-dream', nickname: r.nickname.trim(), loaded: items,
      kept: { item: r.kept.item, nextAction: String(r.kept.nextAction || '').slice(0, 500) },
      removals: Array.isArray(r.removals) ? r.removals : [], undos: Array.isArray(r.undos) ? r.undos : [],
      lanternColor: String(r.lanternColor || '').slice(0, 80), lang: r.lang === 'en' ? 'en' : 'ko',
      startedAt: r.startedAt, finishedAt: r.finishedAt,
    };
    const completed = await rpc(env, 'complete_room_visit', {
      p_visit_id: context.visit_id, p_signal_key: env.ROOM_SIGNAL_KEY, p_result: result,
    });
    if (completed.status !== 'completed') throw new Error('COMPLETION_FAILED');
    // Re-resolve after completion to cover simultaneous retries with different payloads.
    const saved = await rpc(env, 'resolve_lantern_launch', { p_token: body.token, p_signal_key: env.ROOM_SIGNAL_KEY });
    result = saved.result;
    if (!result?.kept?.item) throw new Error('COMPLETION_FAILED');
    // One key per visit avoids lost updates in the legacy shared KV feed array.
    await env.ROOMB.put(`app-feed:${context.visit_id}`, JSON.stringify({
      k: `app/${context.visit_id}`, id: context.participant_code, nickname: result.nickname,
      item: result.kept.item, color: result.lanternColor,
      at: Date.parse(completed.completed_at),
    }), { expirationTtl: 604800 });
    return reply({ status: 'completed', visit_id: context.visit_id });
  } catch {
    return reply({ error: 'BRIDGE_REQUEST_FAILED' }, 502);
  }
}

async function callRpc(env, name, args) {
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(args), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('SUPABASE_REQUEST_FAILED');
  return response.json();
}
