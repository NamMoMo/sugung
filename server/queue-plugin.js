import { loadEnv } from 'vite';

// Only the local exhibition server sees the room signal key.
export function queuePlugin() {
  let config;
  return {
    name: 'beliefs-participant-queue',
    configResolved(value) { config = value; },
    configureServer(server) { install(server); },
    configurePreviewServer(server) { install(server); },
  };
  function install(server) {
    const env = { ...loadEnv(config.mode, config.root, ''), ...process.env };
    server.middlewares.use('/api/participant-queue', async (req, res) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      const send = (status, data) => { res.statusCode = status; res.end(JSON.stringify(data)); };
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host || '')) return send(403, { error: '전시 PC에서만 접근할 수 있습니다.' });
      // The station API is deliberately restricted to the local operator browser.
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) return send(403, { error: '허용되지 않은 요청입니다.' });
      if (!env.ROOM_SIGNAL_KEY || !env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) return send(503, { error: '전시 PC의 .env에 Supabase 및 ROOM_SIGNAL_KEY 설정이 필요합니다.' });
      let action, body = {};
      try {
        if (req.method === 'GET' && req.url === '/') action = 'state';
        else if (req.method === 'POST' && ['/claim', '/release', '/complete'].includes(req.url)) {
          action = req.url.slice(1);
          let raw = '';
          for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 65536) throw new Error('TOO_LARGE'); }
          body = JSON.parse(raw || '{}');
          if (!/^[a-f0-9-]{36}$/i.test(body.visit_id || '')) throw new Error('INVALID_VISIT');
        } else return send(404, { error: '지원하지 않는 요청입니다.' });
        const args = { p_signal_key: env.ROOM_SIGNAL_KEY };
        if (action !== 'state') args.p_visit_id = body.visit_id;
        if (action === 'complete') args.p_result = body.result;
        const upstream = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/beliefs_queue_${action}`, {
          method: 'POST', headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify(args), signal: AbortSignal.timeout(12000),
        });
        if (!upstream.ok) return send(409, { error: '대기 상태가 바뀌었거나 DB 설정을 확인해야 합니다. 새로고침 후 다시 시도해 주세요.' });
        send(200, await upstream.json());
      } catch { send(502, { error: '대기 명단 서버에 연결하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.' }); }
    });
  }
}
