"""Plays a level by touch alone, in whichever browser PLAYTEST_ENGINE names.

Children play this on touch screens, and the other playtests use a mouse. A robot with a finger taps every
control on a question, then wins the level. It fails if a control doesn't respond, if a short tap on a
hold-to-open button opens anything, if the level can't be won, on a page error, or if tapping makes the
browser load anything or leave the page.

    python tools/playtest/touch_test.py
    PLAYTEST_ENGINE=firefox python tools/playtest/touch_test.py
"""
import asyncio, os, sys, time
from playwright.async_api import async_playwright
import localsite
from playtest import STATE

OUT = os.path.join(os.path.dirname(__file__), 'out')
PORT = 8784
SPEED = 2.5
COUNT_TALK = "(() => { window.talks = 0; const said = talk; talk = (...a) => { window.talks++; return said(...a); }; })()"
SETTINGS = "localStorage.setItem('bobs-outpost-settings', JSON.stringify({ diff: 'easy', unlocked: 4, mode: 'both', move: 'auto' }))"
CENTRE = "s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }"
# control, what should be true just after a tap on it (None: only that the game carries on)
CONTROLS = (('#replay', 'window.talks > 0'), ('#musicBtn', '!S.music'), ('#musicBtn', 'S.music'), ('#gearBtn', "$('settings').hidden"),
            ('#homeBtn', "!$('hud').hidden"), ('#jumpBtn', '!hero.onGround'), ('#actBtn', 'hero.actT > 0'), ('#prompt', None), ('#bag', None))


async def tap(page, selector):
    await page.touchscreen.tap(*await page.evaluate(CENTRE, selector))


async def wait_for_phase(page, phase):
    for _ in range(400):
        if await page.evaluate('phase') == phase: return True
        await page.wait_for_timeout(100)
    return False


async def open_level(page, errors):
    await page.goto(f'{localsite.address(PORT)}index.html?speed={SPEED}')
    await page.evaluate(SETTINGS); await page.reload(); await page.wait_for_timeout(1500)
    await tap(page, '.char[data-char="dragon"]'); await page.wait_for_timeout(400)
    await tap(page, '.lvl[data-lvl="0"]')
    if not await wait_for_phase(page, 'ask'): errors.append('never reached the first question')


async def check_controls(page, errors):
    await page.evaluate(COUNT_TALK)
    for selector, expected in CONTROLS:
        await tap(page, selector); await page.wait_for_timeout(120)
        if expected and not await page.evaluate(expected): errors.append(f'after tapping {selector}: expected {expected}')
        await page.wait_for_timeout(1000)  # let a jump or a blast finish before the next control


async def check_wrong_answer(page, errors):
    st = await page.evaluate(STATE)
    wrong = [i for i in st['items'] if i['val'] != st['target']]
    if st['type'] == 'count' or not wrong: return
    await page.touchscreen.tap(wrong[0]['x'] * st['SC'], (wrong[0]['y'] - 32) * st['SC']); await page.wait_for_timeout(200)
    if await page.evaluate('phase') != 'ask': errors.append('a wrong answer moved the game on')


def answer_point(st):
    """Where to tap for the right answer, or None if it isn't on the screen yet."""
    if st['type'] == 'count':
        return (st['items'][0]['x'], st['items'][0]['y']) if st['items'] else None
    right = next((i for i in st['items'] if i['val'] == st['target']), None)
    return (right['x'], right['y'] - 32) if right else None


async def tap_answer(page, st):
    point = answer_point(st)
    if point: await page.touchscreen.tap(point[0] * st['SC'], point[1] * st['SC'])


async def win_level(page, errors):
    t0 = time.time()
    while time.time() - t0 < 240:
        st = await page.evaluate(STATE)
        if st['fin']: return
        if st['phase'] in ('ask', 'bask'):
            await tap_answer(page, st); await page.wait_for_timeout(350)
        elif st['phase'] == 'place' and st['box']:
            await page.wait_for_timeout(300); await page.touchscreen.tap(st['box']['cx'] * st['SC'], st['box']['cy'] * st['SC'])
        await page.wait_for_timeout(120)
    errors.append('the level was not won by touch')


def watch_loading(page, loads):
    """A font can download the first time it is used; anything else after the game has started is a problem."""
    def request(r):
        if 'fonts.gstatic.com' not in r.url: loads.append(r.url)
    page.on('request', request)
    page.on('framenavigated', lambda f: loads.append('navigated to ' + f.url))


async def main():
    os.makedirs(OUT, exist_ok=True)
    srv = localsite.serve(PORT); errors = []; loads = []
    async with async_playwright() as p:
        browser = await localsite.launch(p)
        page = await browser.new_page(viewport={'width': 393, 'height': 670}, has_touch=True)
        localsite.watch(page, errors, PORT, 'touch')
        await open_level(page, errors)
        watch_loading(page, loads)
        await check_controls(page, errors)
        await check_wrong_answer(page, errors)
        await win_level(page, errors)
        await page.screenshot(path=f'{OUT}/touch_{localsite.ENGINE}_finish.png')
        await browser.close()
    srv.shutdown()
    if loads: errors.append(f'tapping made the browser load: {loads}')
    print(f'touch ({localsite.ENGINE}): errors:', errors)
    return not errors

if __name__ == '__main__':
    sys.exit(0 if asyncio.run(main()) else 1)
