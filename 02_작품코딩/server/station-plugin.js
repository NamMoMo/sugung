import { loadEnv } from 'vite';
import { validateTreasureResult } from '../src/treasure-result.js';

export function stationPlugin() {
  let config;
  return { name: 'treasure-station', configResolved(value) { config = value; },
    configureServer: install, configurePreviewServer: install };
  function install(server) {
    const env = { ...loadEnv(config.mode, config.root, ''), ...process.env };
    server.middlewares.use('/api/treasure-station', async (req, res) => {
      const send = (status, data) => { res.statusCode = status; res.end(JSON.stringify(data)); };
      res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
      if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '') ||
          (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`))
        return send(403, { error: '전시 PC에서만 접근할 수 있습니다.' });
      if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY || !env.ROOM_SIGNAL_KEY)
        return send(503, { error: '전시 PC의 .env에 2조 연결 키를 설정해 주세요.' });
      let action, body = {};
      try {
        if (req.method === 'GET' && req.url === '/') action = 'state';
        else if (req.method === 'POST' && ['/start', '/save', '/release'].includes(req.url)) {
          action = req.url.slice(1); let text = '';
          for await (const chunk of req) { text += chunk; if (Buffer.byteLength(text) > 65536) throw new Error('TOO_LARGE'); }
          body = JSON.parse(text);
          if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body.visit_id || '')) throw new Error('INVALID_VISIT');
          if (action === 'save' && !validateTreasureResult(body.result)) throw new Error('INVALID_RESULT');
        } else return send(404, { error: '지원하지 않는 요청입니다.' });
        const args = { p_signal_key: env.ROOM_SIGNAL_KEY };
        if (action !== 'state') args.p_visit_id = body.visit_id;
        if (action === 'save') args.p_result = body.result;
        if (action === 'start') { if(!Number.isFinite(Date.parse(body.started_at)))throw new Error('INVALID_START');args.p_started_at=body.started_at; }
        const upstream = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/treasure_station_${action}`, {
          method: 'POST', headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify(args), signal: AbortSignal.timeout(12000),
        });
        const data = await upstream.json();
        if (!upstream.ok) {
          const code = ['VISIT_STOPPED', 'VISIT_NOT_CURRENT', 'RESULT_REVISION_CONFLICT'].includes(data.message) ? data.message : undefined;
          return send(409, { code, error: code === 'RESULT_REVISION_CONFLICT' ? '결과 저장 순서를 확인하지 못했습니다. 운영자에게 알려 주세요.' : '체험 상태 또는 DB 설정을 확인한 뒤 다시 시도해 주세요.' });
        }
        return send(200, data);
      } catch (error) {
        const invalid = ['TOO_LARGE', 'INVALID_VISIT', 'INVALID_RESULT','INVALID_START'].includes(error.message) || error instanceof SyntaxError;
        return send(invalid ? 400 : 502, { error: invalid ? '올바른 체험 결과를 확인하지 못했습니다.' : '체험 서버에 연결하지 못했습니다. 다시 시도해 주세요.' });
      }
    });
  }
}
