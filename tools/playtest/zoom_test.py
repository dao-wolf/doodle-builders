"""Checks that nothing in the game lets the browser zoom.

Safari on iPhones zooms in on a double tap unless the element tapped says no itself: it doesn't pass body's
setting on to positioned elements (WebKit bug 218015), and a game zoomed in can't be zoomed back out. So on every
screen, every element must have its own touch-action that isn't auto, and Safari's pinch events and the dblclick a
double tap makes must be cancelled. A robot can't double-tap a real iPhone, so this checks the settings that stop
it; try a release by hand on an iPhone too.

    python tools/playtest/zoom_test.py
    PLAYTEST_ENGINE=webkit python tools/playtest/zoom_test.py
"""
import asyncio, os, sys
from playwright.async_api import async_playwright
import localsite

PORT = 8787
SETTINGS = "localStorage.setItem('bobs-outpost-settings', JSON.stringify({ diff: 'easy', unlocked: 4, mode: 'both', move: 'manual', music: false }))"
# each screen, and how to get to it
SCREENS = (('start', '() => {}'),
           ('outposts', '() => showLevels()'),
           ('den', "() => { S.char = 'lava'; openDen(); }"),
           ('den costumes', "() => { setTray('dress'); }"),
           ('level with a question', "() => { startLevel(0); qi = 0; askQuestion('journey'); }"),
           ('finish', "() => { $('finish').hidden = false; }"),
           ('grown-ups check', '() => askGrownUp(openSettings)'),
           ('settings', '() => { closeGate(); openSettings(); }'),
           ('voice studio', "() => $('openStudio').click()"))
# elements on screen whose own touch-action is auto, so a double tap on them can zoom
ZOOMABLE = '''() => [document.documentElement, ...document.body.querySelectorAll('*'), document.body]
  .filter(e => e.getClientRects().length && getComputedStyle(e).touchAction === 'auto')
  .map(e => e.id ? '#' + e.id : e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : ''))'''
# Safari's pinch events, and a double tap's dblclick, that the game doesn't cancel
NOT_CANCELLED = '''() => ['gesturestart', 'gesturechange', 'dblclick'].filter(t => {
  const e = new Event(t, { bubbles: true, cancelable: true }); $('game').dispatchEvent(e); return !e.defaultPrevented; })'''


async def main():
    srv = localsite.serve(PORT); errors = []
    async with async_playwright() as p:
        browser = await localsite.launch(p)
        page = await browser.new_page(viewport={'width': 393, 'height': 760}, has_touch=True)
        localsite.watch(page, errors, PORT, 'zoom')
        await page.goto(f'{localsite.address(PORT)}index.html?date=2026-12-01')
        await page.evaluate(SETTINGS); await page.reload(); await page.wait_for_timeout(700)
        for name, show in SCREENS:
            await page.evaluate(show); await page.wait_for_timeout(300)
            found = sorted(set(await page.evaluate(ZOOMABLE)))
            if found: errors.append(f'{name}: {len(found)} kinds of element a double tap can zoom: {found[:12]}')
        missed = await page.evaluate(NOT_CANCELLED)
        if missed: errors.append(f'not cancelled: {missed}')
        await browser.close()
    srv.shutdown()
    print(f'zoom ({localsite.ENGINE}): {len(SCREENS)} screens; errors:', errors)
    return not errors

if __name__ == '__main__':
    sys.exit(0 if asyncio.run(main()) else 1)
