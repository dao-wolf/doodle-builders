"""Automated playthrough of Bob's Outpost in headless Chromium.

A robot player picks a hero, walks (with the arrow keys in manual mode), answers every question
(sometimes picking a wrong answer first), blows Nibblers away (or is slow to on purpose) and builds the outpost.
It reports how each piece ended up and any page errors, and saves screenshots to tools/playtest/out/.

    pip install playwright && playwright install chromium
    python tools/playtest/playtest.py                 # all scenarios
    python tools/playtest/playtest.py phone-manual    # one scenario
"""
import asyncio, functools, http.server, os, socketserver, sys, threading, time
from playwright.async_api import async_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(os.path.dirname(__file__), 'out')
PORT = 8780
SPEED = 2.5

SCENARIOS = {  # name: (width, height, hero, difficulty, level, movement, style)
    'phone-manual': (390, 844, 'bob', 'easy', 0, 'manual', 'defend'),
    'desktop-auto-medium': (1280, 720, 'henry', 'medium', 1, 'auto', 'lazy'),
    'phone-hard-manual': (390, 844, 'henry', 'hard', 2, 'manual', 'lazy'),
    'desktop-hard-auto': (1280, 720, 'bob', 'hard', 3, 'auto', 'defend'),
}

STATE = '''() => ({ phase, type: round && round.type, target: round && round.target, SC, status: status.slice(), GY, camX,
  heroX: hero.x - camX,
  items: items.filter(i => i.state === 'idle' && now >= i.born).map(i => ({ x: i.x, y: i.y, val: i.val, kind: i.kind })),
  nibs: nibs.map(n => ({ state: n.state, x: n.x - camX })),
  box: carry ? pieceBoxScreen(carry.piece) : null, fin: !document.getElementById('finish').hidden,
  finText: document.getElementById('finText').textContent, paused: isPaused() })'''


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


class Server(socketserver.ThreadingTCPServer):
    # a thread per request, so a connection Chromium opens early can't hold up the rest,
    # and a long enough queue that parallel pages aren't turned away
    allow_reuse_address = daemon_threads = True
    request_queue_size = 64


async def play(browser, name, w, h, hero, diff, level, move, style):
    page = await browser.new_page(viewport={'width': w, 'height': h}, has_touch=True)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    await page.goto(f'http://127.0.0.1:{PORT}/index.html?speed={SPEED}')
    await page.evaluate(f"localStorage.setItem('bobs-outpost-settings', JSON.stringify({{diff:'{diff}', unlocked:4, mode:'both', move:'{move}'}}))")
    await page.reload(); await page.wait_for_timeout(800)
    await page.click(f'.char[data-char="{hero}"]'); await page.wait_for_timeout(400)
    await page.click(f'.lvl[data-lvl="{level}"]')
    shots, log, seen, last, t0, holding, tested_pause = set(), [], None, None, time.time(), False, False

    async def shot(tag):
        if tag not in shots:
            shots.add(tag); await page.screenshot(path=f'{OUT}/{name}_{tag}.png')

    while time.time() - t0 < 400:
        st = await page.evaluate(STATE)
        if st['fin']:
            await page.wait_for_timeout(300); await shot('finish'); break
        sc = st['SC']
        if st['status'] != last:
            log.append((round(time.time() - t0, 1), st['phase'], ''.join(x[0] for x in st['status']))); last = st['status']
        active = [n for n in st['nibs'] if n['state'] in ('pop', 'walk', 'nibble', 'gloat') or (n['state'] == 'flee' and -70 < n['x'] < w / sc + 70)]
        if active:
            if seen is None:
                seen = time.time(); await shot('nibbler')
            thief = any(n['state'] in ('gloat', 'flee') for n in active)
            if time.time() - seen > (0.4 if style == 'defend' else (0.5 if thief else 4.5)):
                await page.click('#actBtn', force=True); await page.wait_for_timeout(250); await shot('blast'); seen = time.time() + 0.6
        else:
            seen = None
        if st['phase'] == 'walk' and move == 'manual':
            if not tested_pause and st['status'][0] == 'held':  # hold the gear button: the game must pause
                tested_pause = True
                if holding: await page.keyboard.up('ArrowRight'); holding = False
                gear = await page.locator('#gearBtn').bounding_box()
                await page.mouse.move(gear['x'] + 20, gear['y'] + 20); await page.mouse.down(); await page.wait_for_timeout(900); await page.mouse.up()
                a = await page.evaluate('hero.x'); await page.wait_for_timeout(600); b = await page.evaluate('hero.x')
                p = await page.evaluate('isPaused()')
                await shot('settings_ingame'); await page.click('#setDone')
                log.append(('pause-check', 'paused' if p and a == b else 'NOT PAUSED'))
                # tap the ground ahead once to check tap-to-walk
                await page.mouse.click((st['heroX'] + 150) * sc, (st['GY'] + 10) * sc); await page.wait_for_timeout(500)
                log.append(('tap-walk', 'moved' if await page.evaluate('hero.x') > b + 20 else 'DID NOT MOVE'))
            if not holding:
                await page.keyboard.down('ArrowRight'); holding = True
            await shot('walk')
        elif holding:
            await page.keyboard.up('ArrowRight'); holding = False
        if st['phase'] in ('ask', 'bask'):
            await shot('ask_' + st['phase'] + '_' + (st['type'] or ''))
            if st['type'] == 'count':
                if st['items']: g = st['items'][0]; await page.mouse.click(g['x'] * sc, g['y'] * sc)
            else:
                right = [x for x in st['items'] if x['val'] == st['target']]
                wrong = [x for x in st['items'] if x['val'] != st['target']]
                if right:
                    if wrong and int(time.time()) % 5 == 0:
                        await page.mouse.click(wrong[0]['x'] * sc, (wrong[0]['y'] - 32) * sc); await page.wait_for_timeout(300)
                    await page.mouse.click(right[0]['x'] * sc, (right[0]['y'] - 32) * sc)
            await page.wait_for_timeout(350)
        elif st['phase'] == 'place' and st['box']:
            await shot('place'); b = st['box']; await page.wait_for_timeout(300); await page.mouse.click(b['cx'] * sc, b['cy'] * sc)
        await page.wait_for_timeout(120)
    st = await page.evaluate(STATE)
    print(f"{name}: finished={st['fin']} pieces={st['status']} | {st['finText']} | errors={errors[:3]} | {round(time.time() - t0)}s")
    print('   ', [x for x in log if not isinstance(x[0], float)] or '', ' timeline:', [x for x in log if isinstance(x[0], float)][:30])
    await page.close()
    return st['fin'] and not errors


async def main(names):
    os.makedirs(OUT, exist_ok=True)
    srv = Server(('127.0.0.1', PORT), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        results = await asyncio.gather(*[play(browser, n, *SCENARIOS[n]) for n in names])
        await browser.close()
    srv.shutdown()
    return all(results)

if __name__ == '__main__':
    picked = sys.argv[1:] or list(SCENARIOS)
    ok = asyncio.run(main(picked))
    sys.exit(0 if ok else 1)
