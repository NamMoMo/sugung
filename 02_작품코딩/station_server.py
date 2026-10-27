"""Room-scoped Supabase bridge. No credentials are sent to the browser."""
import json
import math
import os
import uuid
from datetime import datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
QUESTIONS = [
    ['높은 연봉', '고용 안정', '워라밸', '성장 기회'],
    ['자율성', '체계성', '협력', '독립성'],
    ['목표 달성', '타인의 인정', '정당한 보상', '자기발전'],
    ['원칙 준수', '융통성', '공정성', '인간적 배려'],
    ['아이디어 실현', '깊이 있는 연구', '규칙적인 업무', '협업 프로젝트'],
    ['경제적 여유', '전문성', '사회적 영향력', '시간적 자유'],
    ['자아실현', '경제적 독립', '사회적 기여', '명예'],
]


class StationError(Exception):
    def __init__(self, message, status=409, code=''):
        super().__init__(message)
        self.status = status
        self.code = code


def load_settings(root=ROOT):
    values = {}
    path = root / '.env'
    if path.is_file():
        for line in path.read_text(encoding='utf-8-sig').splitlines():
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            values[key.strip()] = value.strip().strip('"\'')
    return {**values, **os.environ}


def validate_result(result, root=ROOT):
    """Check the final-file scoring rules; SQL checks the same rules again."""
    def require(condition):
        if not condition:
            raise StationError('정상 체험 결과가 아닙니다. 테스트 체험은 저장하지 않습니다.', 400)
    require(isinstance(result, dict))
    require(result.get('schema_version') == 1 and result.get('room_id') == 'conflict' and result.get('team_id') == 3)
    require(result.get('completion_mode') == 'normal' and result.get('input_mode') == 'camera')
    chosen, counts = result.get('selected_keywords'), result.get('captured_counts')
    require(isinstance(chosen, list) and len(chosen) == 7)
    require(all(word in options for word, options in zip(chosen, QUESTIONS)))
    require(isinstance(counts, dict))
    require(all(word in chosen and type(count) is int and 1 <= count <= 15 for word, count in counts.items()))
    total = sum(counts.values())
    require(type(result.get('captured_total')) is int and result['captured_total'] == total <= 15)
    active = result.get('rain_active_ms')
    require(type(active) is int and 0 <= active <= 60100)
    require(total == 15 or active >= 60000)
    require(result.get('rain_end_reason') == ('capture_target' if total == 15 else 'active_time_limit'))
    last = result.get('last_captured_word')
    require((last in counts) if total else last == '')
    catalog = json.loads((root / 'word-scores.json').read_text(encoding='utf-8'))['words']
    selection = {side: sum(catalog[word]['side'] == side for word in chosen) for side in ('left', 'right')}
    capture = {side: sum(n for word, n in counts.items() if catalog[word]['side'] == side) for side in ('left', 'right')}
    left, right = selection['left'] + capture['left'], selection['right'] + capture['right']
    side = catalog[last or chosen[-1]]['side'] if left == right else ('left' if left > right else 'right')
    require(result.get('scores') == dict(development=left, stability=right, selection=selection, capture=capture, total=left + right, tie=left == right))
    expected = dict(side=side, label='발전하고자 하는 삶' if side == 'left' else '안정적인 삶', value='발전의 물결' if side == 'left' else '안정의 물결', realm='용궁' if side == 'left' else '육지', bias=(right-left)/(left+right), strength=abs(right-left)/(left+right))
    require(result.get('outcome') == expected)
    questions = result.get('questions')
    require(isinstance(questions, list) and len(questions) == 7)
    require(all(isinstance(q, dict) and q.get('question_index') == i and q.get('word') == word and q.get('side') == catalog[word]['side'] for i, (q, word) in enumerate(zip(questions, chosen))))
    require(result.get('summary') == dict(keywords=chosen, result=expected['value']))
    history = result.get('history')
    require(isinstance(history, list) and len(history) == 7 + total)
    choices = [e for e in history if isinstance(e, dict) and e.get('type') == 'choice']
    catches = [e for e in history if isinstance(e, dict) and e.get('type') == 'capture']
    require(len(choices) == 7 and len(catches) == total)
    require(all(e.get('question_index') == i and e.get('word') == word for i, (e, word) in enumerate(zip(choices, chosen))))
    require({word: sum(e.get('word') == word for e in catches) for word in counts} == counts)
    require(not catches or catches[-1].get('word') == last)
    try:
        started = datetime.fromisoformat(result['started_at'].replace('Z', '+00:00'))
        finished = datetime.fromisoformat(result['finished_at'].replace('Z', '+00:00'))
        duration = (finished - started).total_seconds() * 1000
        require(type(result.get('duration_ms')) is int and math.isfinite(duration) and 0 <= duration <= 86400000 and abs(duration - result['duration_ms']) < 1)
        stamps = [datetime.fromisoformat(e['at'].replace('Z', '+00:00')) for e in history]
        require(all(started <= at <= finished for at in stamps) and stamps == sorted(stamps))
    except (KeyError, ValueError, TypeError, AttributeError):
        require(False)
    return result


class WaveClient:
    def __init__(self, settings=None):
        self.settings = settings if settings is not None else load_settings()

    def rpc(self, action, body):
        env = self.settings
        if not all(env.get(k) for k in ('SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'ROOM_SIGNAL_KEY')):
            raise StationError('전시 PC의 .env에 Supabase 연결 설정이 필요합니다.', 503)
        args = {'p_signal_key': env['ROOM_SIGNAL_KEY']}
        if action != 'state':
            try:
                args['p_visit_id'] = str(uuid.UUID(body.get('visit_id', '')))
            except (ValueError, AttributeError, TypeError):
                raise StationError('연결 관객을 확인해 주세요.', 400)
        if action == 'complete':
            args['p_result'] = validate_result(body.get('result'))
        if action == 'start':
            try:
                started = body['started_at']
                parsed = datetime.fromisoformat(started.replace('Z', '+00:00'))
                if parsed.tzinfo is None:
                    raise ValueError()
            except (KeyError, TypeError, ValueError, AttributeError):
                raise StationError('체험 시작 시간을 확인해 주세요.', 400)
            args['p_started_at'] = started
        request = Request(env['SUPABASE_URL'].rstrip('/') + '/rest/v1/rpc/wave_station_' + action,
                          data=json.dumps(args, ensure_ascii=False).encode(),
                          headers={'apikey': env['SUPABASE_PUBLISHABLE_KEY'], 'Content-Type': 'application/json'})
        try:
            with urlopen(request, timeout=12) as response:
                return json.load(response)
        except HTTPError as error:
            # Never include the request headers/body or the private key in logs/errors.
            try:
                code = json.load(error).get('message', '')
            except Exception:
                code = ''
            messages = {'VISIT_STOPPED': '모바일에서 체험이 중지되었습니다. 처음으로 돌아가 다시 입장해 주세요.',
                        'VISIT_NOT_CURRENT': '연결 관객이 바뀌었습니다. 운영 설정을 확인해 주세요.',
                        'RESULT_CONFLICT': '이미 저장된 결과와 다릅니다. 운영 설정을 확인해 주세요.'}
            raise StationError(messages.get(code, 'DB 설정 또는 체험 상태를 확인해 주세요. 저장 재시도는 안전합니다.'), code=code if code in messages else 'DB_ERROR') from None
        except (URLError, TimeoutError, OSError, ValueError):
            raise StationError('DB에 연결하지 못했습니다. 인터넷 연결 후 다시 시도해 주세요.', 502) from None


class StationMixin:
    def allowed_request(self):
        hosts = {f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}
        host = self.headers.get('Host', '')
        return host in hosts and self.headers.get('Origin', 'http://' + host) == 'http://' + host

    def blocked_file(self):
        parts = unquote(urlsplit(self.path).path).replace('\\', '/').split('/')
        return any(part.startswith('.') or part == '__pycache__' or part.endswith(('.py', '.bat', '.pyc')) for part in parts if part)

    def send_json(self, status, body):
        data = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if not self.allowed_request():
            return self.send_json(403, {'error': '전시 PC에서만 접근할 수 있습니다.'})
        path = urlsplit(self.path).path
        if path in ('/api/wave-station/', '/api/wave-station/state'):
            return self.station_action('state', {})
        if path.startswith('/api/') or self.blocked_file():
            return self.send_json(404, {'error': '지원하지 않는 요청입니다.'})
        return super().do_GET()

    def do_HEAD(self):
        if not self.allowed_request() or self.blocked_file() or urlsplit(self.path).path.startswith('/api/'):
            self.send_response(404)
            self.end_headers()
            return
        return super().do_HEAD()

    def do_POST(self):
        if not self.allowed_request():
            return self.send_json(403, {'error': '허용되지 않은 요청입니다.'})
        action = urlsplit(self.path).path.removeprefix('/api/wave-station/')
        if self.path != '/api/wave-station/' + action or action not in ('start', 'release', 'complete'):
            return self.send_json(404, {'error': '지원하지 않는 요청입니다.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            # Drain a small rejected body so Windows can deliver the JSON error
            # instead of resetting the connection with unread bytes.
            if 65536 < length <= 1048576:
                self.rfile.read(length)
            if not 0 < length <= 65536 or self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                raise ValueError()
            body = json.loads(self.rfile.read(length))
            if not isinstance(body, dict):
                raise ValueError()
        except (ValueError, TypeError):
            return self.send_json(400, {'error': '요청 형식이나 크기를 확인해 주세요.'})
        return self.station_action(action, body)

    def station_action(self, action, body):
        try:
            self.send_json(200, self.server.station_client.rpc(action, body))
        except StationError as error:
            self.send_json(error.status, {'error': str(error), 'code': error.code})
