"""The local web server both playtests use.

It serves the game under /doodle-builders/, the way GitHub Pages does, so a path that only works
from the root of a site (such as /js/util.js) fails here too.
"""
import functools, http.server, os, socketserver, threading

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BASE = '/doodle-builders/'
OPTIONAL = ('voice/my-voice.json',)  # a grown-up's own voice pack: the game works without it


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

    def send_head(self):  # like GitHub Pages, nothing outside BASE
        if not self.path.startswith(BASE):
            self.send_error(404); return None
        self.path = self.path[len(BASE) - 1:]
        return super().send_head()


class Server(socketserver.ThreadingTCPServer):
    # a thread per request, so a connection Chromium opens early can't hold up the rest,
    # and a long enough queue that parallel pages aren't turned away
    allow_reuse_address = daemon_threads = True
    request_queue_size = 64


def address(port):
    return f'http://127.0.0.1:{port}{BASE}'


def serve(port):
    """Starts the server in the background and returns it (call shutdown() when done)."""
    srv = Server(('127.0.0.1', port), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def watch(page, errors, port, name):
    """Adds the page's errors, and any file the game asked for but couldn't load, to errors, and prints
    each one straight away (so it shows even if the test then gets stuck). The game hides some missing
    files (without voice/jenny.json the device voice just speaks instead), so they are checked here."""
    origin = f'http://127.0.0.1:{port}/'

    def add(problem):
        errors.append(problem); print(f'{name}: PROBLEM {problem}', flush=True)

    def response(r):
        path = r.url.split('?')[0]
        needed = path.startswith(origin) and not path.endswith(OPTIONAL)
        if r.status >= 400 and needed:
            add(f'{r.status} {path[len(origin) - 1:]}')
    page.on('pageerror', lambda e: add(str(e)))
    page.on('response', response)
