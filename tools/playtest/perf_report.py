"""Measures what the game costs while it runs, for comparing before and after a change. Local use only: the
numbers depend on the machine, so CI runs perf_test.py instead.

For a phone (390x844 at 3x) and a tablet (1024x1366 at 2x), on the title screen and the question screen, it prints
the frames drawn a second, how busy the browser's main thread was (painting the canvas counts here), and the canvas
size. Headless Chromium paints on the CPU, so "busy" overstates what a real device's graphics chip does, but it
shows which way a change moves the cost.

    python tools/playtest/perf_report.py              # this copy of the game
    python tools/playtest/perf_report.py --slow 4     # with the CPU slowed down 4 times, a rough budget phone
"""
import argparse, asyncio
from playwright.async_api import async_playwright
import localsite

PORT = 8784
DEVICES = [('phone', 390, 844, 3), ('tablet', 1024, 1366, 2)]
COUNT = "() => { const d = draw; window.__frames = 0; window.draw = (...a) => { window.__frames++; return d(...a); }; }"


async def open_game(p, w, h, dsf, slow):
    browser = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    page = await browser.new_page(viewport={'width': w, 'height': h}, device_scale_factor=dsf, has_touch=True)
    cdp = await page.context.new_cdp_session(page); await cdp.send('Performance.enable')
    if slow > 1: await cdp.send('Emulation.setCPUThrottlingRate', {'rate': slow})
    await page.goto(f'{localsite.address(PORT)}index.html')
    await page.evaluate("localStorage.setItem('bobs-outpost-settings', JSON.stringify({unlocked:4, mode:'both', move:'auto'}))")
    await page.reload(); await page.wait_for_timeout(1500)
    await page.evaluate(COUNT)
    return browser, page, cdp


async def measure(page, cdp, secs=5):
    busy = lambda m: next(x['value'] for x in m['metrics'] if x['name'] == 'TaskDuration')
    f0, t0, b0 = await page.evaluate('window.__frames'), await page.evaluate('performance.now()'), busy(await cdp.send('Performance.getMetrics'))
    await page.wait_for_timeout(secs * 1000)
    f1, t1, b1 = await page.evaluate('window.__frames'), await page.evaluate('performance.now()'), busy(await cdp.send('Performance.getMetrics'))
    wall = (t1 - t0) / 1000
    return (f1 - f0) / wall, (b1 - b0) / wall * 100, await page.evaluate("cv.width + 'x' + cv.height")


async def main(slow):
    srv = localsite.serve(PORT)
    print(f"{'device':8} {'screen':9} {'fps':>5} {'busy %':>7}  canvas")
    async with async_playwright() as p:
        for name, w, h, dsf in DEVICES:
            browser, page, cdp = await open_game(p, w, h, dsf, slow)
            print(f"{name:8} {'title':9} {'%5.1f %7.1f  %s' % await measure(page, cdp)}")
            await page.click('.char[data-char="bob"]'); await page.wait_for_timeout(300)
            await page.click('.lvl[data-lvl="0"]'); await page.wait_for_timeout(3000)
            print(f"{name:8} {'question':9} {'%5.1f %7.1f  %s' % await measure(page, cdp)}")
            await browser.close()
    srv.shutdown()

if __name__ == '__main__':
    a = argparse.ArgumentParser(); a.add_argument('--slow', type=float, default=1, help='slow the CPU down this many times')
    asyncio.run(main(a.parse_args().slow))
