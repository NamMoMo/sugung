"""Local-only server. Double-click start_camera.bat on Windows."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser
import re
import argparse
from station_server import StationMixin, WaveClient

class WaveHTTPServer(ThreadingHTTPServer):
    # Windows must not bind over an older exhibition server on the same port.
    allow_reuse_address = False

class Handler(StationMixin, SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      '.mjs': 'text/javascript', '.wasm': 'application/wasm'}

    def send_head(self):
        self._range = None
        path = Path(self.translate_path(self.path))
        # MP4 seeking and repeat playback require byte-range responses in Edge.
        if path.is_file() and self.headers.get('Range'):
            match = re.fullmatch(r'bytes=(\d*)-(\d*)', self.headers['Range'].strip())
            size = path.stat().st_size
            if not match or not any(match.groups()):
                self.send_error(416, 'Invalid range')
                return None
            first, last = match.groups()
            start = int(first) if first else max(0, size-int(last))
            end = min(size-1, int(last)) if first and last else size-1
            if start > end or start >= size:
                self.send_response(416)
                self.send_header('Content-Range', f'bytes */{size}')
                self.end_headers()
                return None
            stream = path.open('rb')
            self.send_response(206)
            self.send_header('Content-Type', self.guess_type(str(path)))
            self.send_header('Content-Length', str(end-start+1))
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
            self.send_header('Accept-Ranges', 'bytes')
            self.end_headers()
            stream.seek(start)
            self._range = end-start+1
            return stream
        return super().send_head()

    def copyfile(self, source, outputfile):
        if self._range is None:
            return super().copyfile(source, outputfile)
        remaining = self._range
        while remaining:
            block = source.read(min(65536, remaining))
            if not block:
                break
            outputfile.write(block)
            remaining -= len(block)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Local exhibition server with Supabase bridge')
    parser.add_argument('--port', type=int)
    parser.add_argument('--no-browser', action='store_true')
    options = parser.parse_args()
    root = Path(__file__).resolve().parent
    server = None
    for port in ([options.port] if options.port else range(8000, 8021)):
        try:
            server = WaveHTTPServer(('127.0.0.1', port), partial(Handler, directory=str(root)))
            break
        except OSError:
            pass
    if server is None:
        raise SystemExit('Ports 8000-8020 are busy. Close another local server and retry.')
    url = f'http://localhost:{server.server_port}'
    server.station_client = WaveClient()
    print(f'Camera version: {url}\nKeep this window open. Ctrl+C to stop.', flush=True)
    if not options.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
