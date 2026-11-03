"""Measures what the game costs while it runs, for comparing before and after a change. Local use only: the
numbers depend on the machine, so CI runs perf_test.py instead.

On the title screen and the question screen it prints the frames drawn a second, a CPU figure and the canvas size,
in one of two browser engines:
- Chromium (default): a phone (390x844 at 3x) and a tablet (1024x1366 at 2x). "busy %" is how busy the main
  thread was. Headless Chromium paints the canvas on the CPU, so this overstates what a real device's graphics chip
  does, but it shows which way a change moves the cost.
- WebKit, Safari's engine, as on iPhones and iPads: Playwright's iPhone 15 and iPad Pro 11 presets (screen size,
  pixel density, touch, Safari's user agent). "WebKit CPU %" is the CPU time of WebKit's web content and GPU
  processes, read with ps (macOS). The graphics chip's own drawing isn't counted.

    python tools/playtest/perf_report.py                   # Chromium
    python tools/playtest/perf_report.py --engine webkit   # WebKit, Safari's engine
    python tools/playtest/perf_report.py --slow 4          # Chromium with the CPU slowed down 4 times, a rough budget phone
    python tools/playtest/perf_report.py --hero dragon     # play as another hero (default Bob)
"""
import argparse, asyncio, subprocess
from playwright.async_api import async_playwright
import localsite

PORT = 8784
COUNT = "() => { const d = draw; window.__frames = 0; window.draw = (...a) => { window.__frames++; return d(...a); }; }"


class Chromium:
    label = 'busy %'

    def __init__(self, p, slow): self.p, self.slow = p, slow

    def devices(self):
        return [(name, {'viewport': {'width': w, 'height': h}, 'device_scale_factor': dsf, 'has_touch': True})
                for name, w, h, dsf in [('phone', 390, 844, 3), ('tablet', 1024, 1366, 2)]]

    async def launch(self): return await self.p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])

    async def watch(self, page):
        self.cdp = await page.context.new_cdp_session(page); await self.cdp.send('Performance.enable')
        if self.slow > 1: await self.cdp.send('Emulation.setCPUThrottlingRate', {'rate': self.slow})

    async def cpu_seconds(self):
        m = await self.cdp.send('Performance.getMetrics')
        return next(x['value'] for x in m['metrics'] if x['name'] == 'TaskDuration')


class WebKit:
    label = 'WebKit CPU %'

    def __init__(self, p, slow): self.p = p

    def devices(self): return [(name, self.p.devices[name]) for name in ('iPhone 15', 'iPad Pro 11')]

    async def launch(self): return await self.p.webkit.launch()

    async def watch(self, page): pass

    async def cpu_seconds(self):
        """CPU time so far of Playwright's WebKit web content and GPU processes."""
        out = subprocess.run(['ps', '-axo', 'time=,command='], capture_output=True, text=True).stdout
        lines = [line.split(None, 1) for line in out.splitlines() if 'ms-playwright/webkit' in line]
        return sum(seconds(t) for t, cmd in lines if 'WebContent' in cmd or 'GPU' in cmd)


def seconds(t):
    """ps cumulative time ('1:02.35', '1-02:03:04') in seconds."""
    total = 0.0
    for part in t.replace('-', ':').split(':'): total = total * 60 + float(part)
    return total


async def open_game(engine, options):
    browser = await engine.launch()
    page = await (await browser.new_context(**options)).new_page()
    await engine.watch(page)
    await page.goto(f'{localsite.address(PORT)}index.html')
    await page.evaluate("localStorage.setItem('bobs-outpost-settings', JSON.stringify({unlocked:4, mode:'both', move:'auto'}))")
    await page.reload(); await page.wait_for_timeout(1500)
    await page.evaluate(COUNT)
    return browser, page


async def measure(engine, page, secs=5):
    f0, t0, c0 = await page.evaluate('window.__frames'), await page.evaluate('performance.now()'), await engine.cpu_seconds()
    await page.wait_for_timeout(secs * 1000)
    f1, t1, c1 = await page.evaluate('window.__frames'), await page.evaluate('performance.now()'), await engine.cpu_seconds()
    wall = (t1 - t0) / 1000
    return (f1 - f0) / wall, (c1 - c0) / wall * 100, await page.evaluate("cv.width + 'x' + cv.height")


async def main(kind, slow, hero):
    srv = localsite.serve(PORT)
    async with async_playwright() as p:
        engine = (WebKit if kind == 'webkit' else Chromium)(p, slow)
        print(f"{'device':12} {'screen':9} {'fps':>5} {engine.label:>12}  canvas")
        for name, options in engine.devices():
            browser, page = await open_game(engine, options)
            print(f"{name:12} {'title':9} {'%5.1f %12.1f  %s' % await measure(engine, page)}")
            await page.click(f'.char[data-char="{hero}"]'); await page.wait_for_timeout(300)
            await page.click('.lvl[data-lvl="0"]'); await page.wait_for_timeout(3000)
            print(f"{name:12} {'question':9} {'%5.1f %12.1f  %s' % await measure(engine, page)}")
            await browser.close()
    srv.shutdown()

if __name__ == '__main__':
    a = argparse.ArgumentParser()
    a.add_argument('--engine', choices=['chromium', 'webkit'], default='chromium', help='the browser engine to measure in')
    a.add_argument('--slow', type=float, default=1, help='slow the CPU down this many times (Chromium only)')
    a.add_argument('--hero', choices=['bob', 'henry', 'dragon'], default='bob', help='the hero to play as')
    args = a.parse_args()
    if args.slow > 1 and args.engine == 'webkit': a.error('--slow works with Chromium only')
    asyncio.run(main(args.engine, args.slow, args.hero))
