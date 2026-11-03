"""Guards what the game costs a phone or tablet while it runs.

The game repaints its whole screen every frame, so drawing too often, or on too big a canvas, makes devices hot.
On the question screen at tablet size (1024x1366 at 2x), the test fails if:
- the game draws more than about 30 frames a second (FRAME_MS in js/main.js)
- the canvas has more pixels than BUDGET (the same number as MAX_PIXELS in js/game.js: raise both together, on purpose)
- the music is off but notes are still being synthesised
- a hidden page doesn't suspend the sound
None of these depend on how fast the machine is. For timings, run perf_report.py.

    python tools/playtest/perf_test.py
"""
import asyncio, os, sys
from playwright.async_api import async_playwright
import localsite

OUT = os.path.join(os.path.dirname(__file__), 'out')
PORT = 8783
BUDGET = 1_700_000  # canvas pixels

# counts the frames drawn and the music notes made (tone() calls that play through musicGain)
COUNT = '''() => { const d = draw, t = tone; window.__frames = 0; window.__notes = 0;
  window.draw = (...a) => { window.__frames++; return d(...a); };
  window.tone = (...a) => { if (a[6] === musicGain) window.__notes++; return t(...a); }; }'''
RATES = '''async () => { const f = window.__frames, n = window.__notes, t = performance.now();
  await new Promise(r => setTimeout(r, 3000)); const s = (performance.now() - t) / 1000;
  return { fps: (window.__frames - f) / s, notes: (window.__notes - n) / s }; }'''
HIDE = '''async (hidden) => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange')); await new Promise(r => setTimeout(r, 400)); return AC.state; }'''


async def start(page):
    await page.goto(f'{localsite.address(PORT)}index.html')
    await page.evaluate("localStorage.setItem('bobs-outpost-settings', JSON.stringify({unlocked:4, mode:'both', move:'auto', music:false}))")
    await page.reload(); await page.wait_for_timeout(800)
    await page.click('.char[data-char="bob"]'); await page.wait_for_timeout(300)
    await page.click('.lvl[data-lvl="0"]'); await page.wait_for_timeout(3000)  # the click also starts the sound
    await page.evaluate(COUNT)


async def checks(page, errors):
    off = await page.evaluate(RATES)
    if not 20 <= off['fps'] <= 31: errors.append(f"drew {off['fps']:.1f} frames a second, expected 20 to 31")
    if off['notes']: errors.append(f"music off, but {off['notes']:.1f} notes a second were synthesised")
    px = await page.evaluate('cv.width * cv.height')
    if px > BUDGET: errors.append(f'canvas has {px} pixels, over the budget of {BUDGET}')
    await page.evaluate('setMusic(true)'); on = await page.evaluate(RATES)
    if not on['notes']: errors.append('music on, but no notes were played')
    if await page.evaluate(HIDE, True) != 'suspended': errors.append('a hidden page did not suspend the sound')
    if await page.evaluate(HIDE, False) != 'running': errors.append('the sound did not come back when the page showed again')
    print(f"perf: {off['fps']:.1f} fps, canvas {px} px (budget {BUDGET}), notes/s music off {off['notes']:.1f}, on {on['notes']:.1f}")


async def main():
    os.makedirs(OUT, exist_ok=True)
    srv = localsite.serve(PORT)
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
        page = await browser.new_page(viewport={'width': 1024, 'height': 1366}, device_scale_factor=2, has_touch=True)
        errors = []; localsite.watch(page, errors, PORT, 'perf')
        await start(page)
        await checks(page, errors)
        print('perf: errors:', errors)
        await browser.close()
    srv.shutdown()
    return not errors

if __name__ == '__main__':
    sys.exit(0 if asyncio.run(main()) else 1)
