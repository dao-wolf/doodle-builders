"""Tests the picture button on the start screen that switches the seasonal look off and on, by touch.

Switched off, the look must stay off in the level that follows: the land, the hero's costume and the outpost's
blocks. That must hold whichever way the player gets to the level, and after the page reloads. A quick second tap
(a double tap, or a child tapping again and again) must count once, so the look doesn't flip back on. Runs as if
it were 1 Dec 2026 (Christmas), whatever today's date is.

    python tools/playtest/season_test.py
    PLAYTEST_ENGINE=webkit python tools/playtest/season_test.py
"""
import asyncio, os, sys
from playwright.async_api import async_playwright
import localsite

OUT = os.path.join(os.path.dirname(__file__), 'out')
PORT = 8788
SETTINGS = "localStorage.setItem('bobs-outpost-settings', JSON.stringify({ diff: 'easy', unlocked: 4, mode: 'both', move: 'auto', music: false }))"
CENTRE = "s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }"
# What shows: plain is true only when nothing seasonal is drawn anywhere
LOOK = '''() => {
  const blocks = LEVELS.every(L => L.pieces.every(p => p.blocks.every(b => !b.skin && !b.over)));
  const land = !LV || TH === THEMES[LV.theme];
  return { season: SEASON && SEASON.id, button: $('seasonBtn').getAttribute('aria-pressed'), blocks, land, playing, plain: !SEASON && blocks && land };
}'''


async def tap(page, selector):
    await page.touchscreen.tap(*await page.evaluate(CENTRE, selector))


async def open_game(browser, errors, name):
    page = await browser.new_page(viewport={'width': 393, 'height': 760}, has_touch=True)
    localsite.watch(page, errors, PORT, name)
    await page.goto(f'{localsite.address(PORT)}index.html?date=2026-12-01&speed=2.5')
    await page.evaluate(SETTINGS); await page.reload(); await page.wait_for_timeout(700)
    return page


async def switch(page):
    """One tap on the picture button, then a pause longer than a double tap."""
    await tap(page, '#seasonBtn'); await page.wait_for_timeout(800)


async def play(page):
    await tap(page, '.char[data-char="bob"]'); await page.wait_for_timeout(300)
    await tap(page, '.lvl[data-lvl="0"]'); await page.wait_for_timeout(800)


async def go_home(page):
    x, y = await page.evaluate(CENTRE, '#homeBtn')
    await page.mouse.move(x, y); await page.mouse.down(); await page.wait_for_timeout(1100); await page.mouse.up(); await page.wait_for_timeout(300)


async def expect(page, errors, when, plain):
    look = await page.evaluate(LOOK)
    if look['plain'] != plain or (look['button'] == 'true') == plain: errors.append(f'{when}: expected the {"plain" if plain else "Christmas"} look, got {look}')


async def check_off_then_play(browser, errors):
    page = await open_game(browser, errors, 'off then play')
    await expect(page, errors, 'on 1 Dec, before any tap', False)
    await switch(page); await expect(page, errors, 'start screen, after switching off', True)
    await play(page); await expect(page, errors, 'level, after switching off', True)
    await page.screenshot(path=f'{OUT}/season_{localsite.ENGINE}_off_level.png')
    await page.close()


async def check_other_routes(browser, errors):
    page = await open_game(browser, errors, 'outposts first')  # look at the outposts, come back, switch off
    await tap(page, '.char[data-char="bob"]'); await page.wait_for_timeout(300); await tap(page, '#lvlBack'); await page.wait_for_timeout(300)
    await switch(page); await play(page); await expect(page, errors, 'outposts seen first, then switched off', True)
    await page.close()
    page = await open_game(browser, errors, 'after a level')  # play with the look on, go home, switch off, play again
    await play(page); await expect(page, errors, 'first level, look on', False)
    await go_home(page); await switch(page); await play(page); await expect(page, errors, 'switched off after a level', True)
    await page.close()


async def check_double_tap(browser, errors):
    page = await open_game(browser, errors, 'double tap')
    await tap(page, '#seasonBtn'); await page.wait_for_timeout(120); await tap(page, '#seasonBtn'); await page.wait_for_timeout(800)
    await expect(page, errors, 'a double tap on the button', True)
    for _ in range(4): await tap(page, '#seasonBtn'); await page.wait_for_timeout(150)  # tapping again and again: one change
    await page.wait_for_timeout(800); await expect(page, errors, 'four quick taps', False)
    await page.close()


async def check_remembered(browser, errors):
    page = await open_game(browser, errors, 'remembered')
    await switch(page); await page.reload(); await page.wait_for_timeout(700)
    await expect(page, errors, 'after a reload', True)
    await play(page); await expect(page, errors, 'level after a reload', True)
    await go_home(page); await switch(page); await play(page); await expect(page, errors, 'switched back on', False)
    await page.close()


CHECKS = check_off_then_play, check_other_routes, check_double_tap, check_remembered


async def main():
    os.makedirs(OUT, exist_ok=True)
    srv = localsite.serve(PORT); errors = []
    async with async_playwright() as p:
        browser = await localsite.launch(p)
        for check in CHECKS:
            try: await check(browser, errors)
            except Exception as e: errors.append(f'{check.__name__} stopped: {str(e).splitlines()[0]}')  # report it, then carry on
        await browser.close()
    srv.shutdown()
    print(f'season button ({localsite.ENGINE}): errors:', errors)
    return not errors

if __name__ == '__main__':
    sys.exit(0 if asyncio.run(main()) else 1)
