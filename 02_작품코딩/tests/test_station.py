import copy
import json
import threading
import unittest
from unittest.mock import patch
from io import BytesIO
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from serve import Handler
from station_server import ROOT, StationError, WaveClient, validate_result

FIXTURES = json.loads((ROOT / 'tests/result-fixtures.json').read_text(encoding='utf-8'))


class FakeClient:
    def __init__(self):
        self.calls = []

    def rpc(self, action, body):
        if action == 'complete':
            validate_result(body.get('result'))
        self.calls.append(action)
        return {'active': None} if action == 'state' else {'status': 'completed'}


class SilentHandler(Handler):
    def log_message(self, *args):
        pass


class ValidationTests(unittest.TestCase):
    def test_start_rpc_uses_fixed_visitor_and_timestamp_and_rejects_invalid_time(self):
        client = WaveClient({'SUPABASE_URL': 'https://fixture.supabase.co', 'SUPABASE_PUBLISHABLE_KEY': 'public-test', 'ROOM_SIGNAL_KEY': 'private-fixture'})
        body = {'visit_id': '5c0fc382-9eb0-42fd-98f6-c9f4b10a287c', 'started_at': '2026-10-27T01:00:00.000Z'}
        with patch('station_server.urlopen', return_value=BytesIO(b'{"status":"active"}')) as upstream:
            self.assertEqual(client.rpc('start', body)['status'], 'active')
            sent = json.loads(upstream.call_args.args[0].data)
            self.assertEqual(sent['p_started_at'], body['started_at'])
            self.assertEqual(sent['p_visit_id'], body['visit_id'])
        with self.assertRaises(StationError):
            client.rpc('start', {**body, 'started_at': 'not-a-time'})
    def test_normal_and_timeout_match_final_catalog(self):
        for result in FIXTURES.values():
            self.assertEqual(validate_result(result), result)

    def test_test_mode_bad_score_bad_question_and_history_rejected(self):
        changes = [lambda r: r.update(input_mode='mouse'),
                   lambda r: r['outcome'].update(side='left'),
                   lambda r: r['selected_keywords'].__setitem__(0, '자율성'),
                   lambda r: r['history'].pop(),
                   lambda r: r['questions'].__setitem__(0, None),
                   lambda r: r.update(duration_ms=1)]
        for change in changes:
            r = copy.deepcopy(FIXTURES['normal'])
            change(r)
            with self.assertRaises(StationError):
                validate_result(r)


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SilentHandler, directory=str(ROOT)))
        cls.client = cls.server.station_client = FakeClient()
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}'

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def fetch(self, path, data=None, headers=None, method=None):
        return urlopen(Request(self.base + path, data=data, headers=headers or {}, method=method), timeout=3)

    def test_state_and_complete_use_room_bridge(self):
        with self.fetch('/api/wave-station/') as response:
            self.assertIsNone(json.load(response)['active'])
        body = json.dumps({'visit_id': '5c0fc382-9eb0-42fd-98f6-c9f4b10a287c', 'result': FIXTURES['normal']}).encode()
        with self.fetch('/api/wave-station/complete', body, {'Content-Type': 'application/json'}) as response:
            self.assertEqual(json.load(response)['status'], 'completed')
        with self.fetch('/api/wave-station/start', json.dumps({'visit_id': '5c0fc382-9eb0-42fd-98f6-c9f4b10a287c', 'started_at': '2026-10-27T01:00:00Z'}).encode(), {'Content-Type': 'application/json'}) as response:
            self.assertEqual(response.status, 200)
        self.assertIn('start', self.client.calls)

    def test_keys_and_python_sources_cannot_be_downloaded(self):
        for path in ['/.env', '/%2eenv', '/station_server.py', '/serve.py', '/.git/config']:
            for method in ['GET', 'HEAD']:
                with self.assertRaises(HTTPError) as caught:
                    self.fetch(path, method=method)
                self.assertEqual(caught.exception.code, 404)

    def test_foreign_origin_and_host_rejected(self):
        for headers in [{'Origin': 'https://foreign.example'}, {'Host': 'foreign.example'}]:
            with self.assertRaises(HTTPError) as caught:
                self.fetch('/api/wave-station/', headers=headers)
            self.assertEqual(caught.exception.code, 403)

    def test_wrong_json_type_large_body_and_incomplete_result_rejected(self):
        for body in [b'[]', b'x' * 65537, b'{"result":{}}']:
            with self.assertRaises(HTTPError) as caught:
                self.fetch('/api/wave-station/complete', body, {'Content-Type': 'application/json'})
            self.assertEqual(caught.exception.code, 400)

    def test_video_range_support_preserved(self):
        with self.fetch('/assets/opening_1080.mp4', headers={'Range': 'bytes=0-15'}) as response:
            self.assertEqual(response.status, 206)
            self.assertEqual(len(response.read()), 16)
            self.assertIn('bytes 0-15/', response.headers['Content-Range'])


if __name__ == '__main__':
    unittest.main()
