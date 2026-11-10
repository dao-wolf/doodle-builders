"""The local web server the playtests use, and the browser they run in.

It serves the game under /doodle-builders/, the way GitHub Pages does, so a path that only works
from the root of a site (such as /js/util.js) fails here too.

Every test browser is started by launch() and is silent, whatever the engine: Firefox and WebKit
would otherwise play the game's sound aloud, on a computer with speakers, all through a run.
"""
import functools, http.server, os, socketserver, threading

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BASE = '/doodle-builders/'
OPTIONAL = ('voice/my-voice.json',)  # a grown-up's own voice pack: the game works without it
ENGINE = os.environ.get('PLAYTEST_ENGINE', 'chromium')  # chromium, firefox or webkit, or chrome or msedge if installed on this computer


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

    def send_head(self):  # like GitHub Pages, nothing outside BASE
        if not self.path.startswith(BASE):
            self.send_error(404); return None
        self.path = self.path[len(BASE) - 1:]
        return super().send_head()


class Server(socketserver.ThreadingTCPServer):
    """A thread per request, so a connection Chromium opens early can't hold up the rest.

    Many pages load their files at once, and each file is a new connection (HTTP/1.0). The operating
    system keeps connections that have arrived but not yet been accepted in a queue, and turns away
    the ones that don't fit with a reset (ERR_CONNECTION_RESET). macOS caps that queue at 128
    (kern.ipc.somaxconn), however long we ask for. The server shares a process with the robots, so when
    twelve of them are busy it gets little time, and socketserver's own loop accepts only one connection
    per pass of its poll loop: the queue fills. So a thread does nothing but accept, as fast as it can,
    and hands each connection to a worker thread. On 10 Nov 2026, 12 pages loading the game 15 times with
    8 busy threads in the process gave 209 failed requests before and none after. CI (Linux) was never affected.
    """
    allow_reuse_address = daemon_threads = True
    request_queue_size = 128

    def serve_forever(self, poll_interval=0.5):
        while True:
            try:
                request, address = self.get_request()
            except OSError:  # shutdown() closed the socket
                return
            self.process_request(request, address)

    def shutdown(self):
        self.socket.close()


# Makes a page silent without changing what the game does. The game's sound all ends at the
# AudioContext's destination (js/audio.js), so anything connected there goes through a gain of 0
# instead: the sound graph still runs, so the work a test measures is the same. The device voice
# (js/voice.js) is told to speak at volume 0. window.__hushed counts the connections redirected,
# which is how silence_test.py knows the silencer is in place.
SILENCE = '''(() => {
  const N = window.AudioNode && AudioNode.prototype, connect = N && N.connect, hush = new WeakMap();
  window.__hushed = 0;
  if (N) N.connect = function hushedConnect(dest, ...rest) {
    if (window.AudioDestinationNode && dest instanceof AudioDestinationNode) {
      let g = hush.get(dest);
      if (!g) { g = dest.context.createGain(); g.gain.value = 0; connect.call(g, dest); hush.set(dest, g); }
      window.__hushed++; connect.call(this, g, ...rest); return dest;
    }
    return connect.call(this, dest, ...rest);
  };
  if (window.speechSynthesis) {
    const speak = speechSynthesis.speak.bind(speechSynthesis);
    speechSynthesis.speak = u => { u.volume = 0; return speak(u); };
  }
})();'''


async def _silenced(browser):
    """Makes every context and page the browser opens from now on run SILENCE before the page's own scripts.
    browser.new_page() makes its own context without going through new_context(), so both are wrapped."""
    new_context = browser.new_context

    async def context(**options):
        ctx = await new_context(**options)
        await ctx.add_init_script(SILENCE)
        return ctx

    async def page(**options):
        return await (await context(**options)).new_page()
    browser.new_context, browser.new_page = context, page
    return browser


async def launch(p, *chromium_args, engine=None):
    """Starts the silent browser `engine` (default PLAYTEST_ENGINE) names. The arguments only mean something to Chromium-based browsers."""
    engine = engine or ENGINE
    if engine == 'firefox':  # no volume at all, whatever the page does
        return await _silenced(await p.firefox.launch(firefox_user_prefs={'media.volume_scale': '0.0'}))
    if engine == 'webkit':  # has no mute switch: SILENCE does it
        return await _silenced(await p.webkit.launch())
    channel = None if engine == 'chromium' else engine
    return await _silenced(await p.chromium.launch(channel=channel, args=[*chromium_args, '--mute-audio']))


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
