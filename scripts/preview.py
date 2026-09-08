"""Dependency-free local preview of the small release-template substitution."""
from hashlib import sha1
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json

ROOT = Path(__file__).resolve().parents[1]
SUFFIXES = {'.html', '.js', '.css', '.svg', '.jpg', '.jpeg', '.png', '.webp', '.json', '.yml'}


def version():
    digest = sha1()
    for path in sorted(ROOT.rglob('*')):
        relative = path.relative_to(ROOT)
        if any(part.startswith('.') or part in {'tests', 'scripts', 'video', 'vendor'} for part in relative.parts):
            continue
        if path.is_file() and path.suffix in SUFFIXES:
            digest.update(str(relative).encode())
            digest.update(path.read_bytes())
    return digest.hexdigest()


def render(source, revision):
    if source.startswith('---\n'):
        source = source.split('---\n', 2)[2]
    return source.replace('{% raw %}', '').replace('{% endraw %}', '').replace('__LUMIE_RELEASE__', revision)


class Preview(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        relative = unquote(urlsplit(self.path).path).lstrip('/') or 'index.html'
        path = (ROOT / relative).resolve()
        if not path.is_relative_to(ROOT):
            self.send_error(403)
            return
        if relative == 'site-version.json':
            body = json.dumps({'version': version()}).encode()
            kind = 'application/json'
        elif path.is_file() and path.suffix == '.html':
            body = render(path.read_text(), version()).encode()
            kind = 'text/html; charset=utf-8'
        else:
            return super().do_GET()
        self.send_response(200)
        self.send_header('Content-Type', kind)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)


if __name__ == '__main__':
    print('Preview: http://127.0.0.1:8765', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8765), Preview).serve_forever()
