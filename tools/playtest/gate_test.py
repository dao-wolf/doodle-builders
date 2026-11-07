"""Tests the grown-ups check in front of the settings.

A child must not get into the settings. A short tap opens nothing; after the hold, the number to type is shown
only in words (no digits) and is never spoken; a wrong answer brings a new number; three in a row lock the check
for a minute. A grown-up who types the number gets in: from the start screen and during a game (which pauses
while the check is open), by touch or with a keyboard.

    python tools/playtest/gate_test.py
    PLAYTEST_ENGINE=webkit python tools/playtest/gate_test.py
"""
import asyncio, os, re, sys
from playwright.async_api import async_playwright
import localsite

PORT = 8789
SETTINGS = "localStorage.setItem('bobs-outpost-settings', JSON.stringify({ diff: 'easy', unlocked: 4, mode: 'both', move: 'auto', music: false }))"
CENTRE = "s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }"
# counts anything the game says, through its own voice or the device's
SPY = "(() => { window.spoken = 0; const said = talk; talk = (...a) => { spoken++; return said(...a); }; speechSynthesis.speak = () => { spoken++; }; })()"
SHOWN = "() => ({ gate: !$('gate').hidden, settings: !$('settings').hidden, keys: !$('gateKeys').hidden, words: $('gateWords').textContent, text: $('gate').innerText, msg: $('gateMsg').textContent })"
TENS = {'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90}
ONES = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9}


def number_in(words):
    """The number a grown-up reads, worked out here rather than by the game: 'forty-seven' is 47."""
    tens, ones = words.split('-')
    return TENS[tens] + ONES[ones]


async def tap(page, selector):
    await page.touchscreen.tap(*await page.evaluate(CENTRE, selector))


async def hold(page, selector, ms=1300):
    x, y = await page.evaluate(CENTRE, selector)
    await page.mouse.move(x, y); await page.mouse.down(); await page.wait_for_timeout(ms); await page.mouse.up(); await page.wait_for_timeout(150)


async def type_number(page, digits, touch=True):
    for d in digits:
        key = f'#gateKeys [data-key="{d}"]'
        await (tap(page, key) if touch else page.click(key)); await page.wait_for_timeout(60)
    await page.wait_for_timeout(150)


async def pass_gate(page, touch=True):
    """Answers the grown-ups check the way a grown-up would: reads the words and taps the digits (or clicks them,
    for tests that use a mouse). The other tests use this to reach the settings."""
    await type_number(page, str(number_in(await page.text_content('#gateWords'))), touch)


async def wrong_answer(page):
    """Types a two-digit number that isn't the one asked for (11 is never asked: the check uses 21 to 99)."""
    await type_number(page, '11')


async def open_game(browser, errors, name):
    page = await browser.new_page(viewport={'width': 393, 'height': 760}, has_touch=True)
    localsite.watch(page, errors, PORT, name)
    await page.goto(f'{localsite.address(PORT)}index.html?season=none&speed=2.5')
    await page.evaluate(SETTINGS); await page.reload(); await page.wait_for_timeout(700)
    await page.evaluate(SPY)
    return page


async def check_short_tap(browser, errors):
    page = await open_game(browser, errors, 'short tap')
    await tap(page, '#grownBtn'); await page.wait_for_timeout(400)
    s = await page.evaluate(SHOWN)
    if s['gate'] or s['settings']: errors.append(f'a short tap on Grown-ups opened something: {s}')
    await page.close()


async def check_child_cannot_read_or_hear_it(browser, errors):
    page = await open_game(browser, errors, 'no digits')
    await hold(page, '#grownBtn'); await page.wait_for_timeout(800)
    s = await page.evaluate(SHOWN)
    if not s['gate'] or s['settings']: errors.append(f'holding Grown-ups should open the check and nothing else: {s}')
    if not re.fullmatch(r'[a-z]+-[a-z]+', s['words']): errors.append(f'the number is not shown in words: {s["words"]!r}')
    shown_text = s['text'].replace(await page.inner_text('#gateKeys'), '')  # the keypad's own digits are allowed
    if re.search(r'\d', shown_text): errors.append(f'the check shows digits outside the keypad: {shown_text!r}')
    if await page.evaluate('spoken'): errors.append('the game said something while the check was open')
    await page.close()


async def check_grown_up_gets_in(browser, errors):
    page = await open_game(browser, errors, 'gets in')
    seen = []
    for _ in range(4):  # a new number each time
        await hold(page, '#grownBtn'); seen.append(await page.text_content('#gateWords')); await tap(page, '#gateBack'); await page.wait_for_timeout(150)
    if any(a == b for a, b in zip(seen, seen[1:])): errors.append(f'the same number came twice in a row: {seen}')
    await hold(page, '#grownBtn'); await pass_gate(page)
    s = await page.evaluate(SHOWN)
    if s['gate'] or not s['settings']: errors.append(f'typing the right number did not open the settings: {s}')
    await page.close()


async def check_wrong_answers_lock(browser, errors):
    page = await open_game(browser, errors, 'wrong answers')
    await hold(page, '#grownBtn')
    for n in 1, 2:
        before = await page.text_content('#gateWords'); await wrong_answer(page)
        s = await page.evaluate(SHOWN)
        if s['settings'] or not s['gate'] or not s['msg'] or s['words'] == before: errors.append(f'after wrong answer {n}: {s}')
    await wrong_answer(page)
    s = await page.evaluate(SHOWN)
    if s['settings'] or s['keys']: errors.append(f'three wrong answers did not lock the check: {s}')
    await tap(page, '#gateBack'); await hold(page, '#grownBtn')
    s = await page.evaluate(SHOWN)
    if s['settings'] or s['keys']: errors.append(f'the check opened again straight after the lock: {s}')
    await tap(page, '#gateBack')
    await page.evaluate("(() => { const real = Date.now; Date.now = () => real() + 61000; })()")  # a minute later
    await hold(page, '#grownBtn'); await pass_gate(page)
    s = await page.evaluate(SHOWN)
    if not s['settings']: errors.append(f'a minute after the lock, the right number did not open the settings: {s}')
    await page.close()


async def check_during_game(browser, errors):
    page = await open_game(browser, errors, 'during a game')
    await tap(page, '.char[data-char="bob"]'); await page.wait_for_timeout(300); await tap(page, '.lvl[data-lvl="0"]')
    await page.wait_for_function("phase === 'walk'", timeout=15000)
    await hold(page, '#gearBtn', 900)
    a = await page.evaluate('hero.x'); await page.wait_for_timeout(700); b = await page.evaluate('hero.x')
    s = await page.evaluate(SHOWN)
    if not s['gate'] or s['settings']: errors.append(f'holding the gear button should open the check: {s}')
    if not await page.evaluate('isPaused()') or a != b: errors.append('the game kept going while the check was open')
    await tap(page, '#gateBack'); await page.wait_for_timeout(900)
    if await page.evaluate('isPaused()'): errors.append('the game stayed paused after Back')
    await hold(page, '#gearBtn', 900); await pass_gate(page)
    if not (await page.evaluate(SHOWN))['settings']: errors.append('the right number during a game did not open the settings')
    await page.close()


async def check_keyboard(browser, errors):
    page = await open_game(browser, errors, 'keyboard')
    await page.focus('#grownBtn'); await page.keyboard.press('Enter'); await page.wait_for_timeout(200)
    await page.keyboard.type(str(number_in(await page.text_content('#gateWords')))); await page.wait_for_timeout(200)
    if not (await page.evaluate(SHOWN))['settings']: errors.append('typing the number on a keyboard did not open the settings')
    await page.close()


CHECKS = check_short_tap, check_child_cannot_read_or_hear_it, check_grown_up_gets_in, check_wrong_answers_lock, check_during_game, check_keyboard


async def main():
    srv = localsite.serve(PORT); errors = []
    async with async_playwright() as p:
        browser = await localsite.launch(p)
        for check in CHECKS:
            try: await check(browser, errors)
            except Exception as e: errors.append(f'{check.__name__} stopped: {str(e).splitlines()[0]}')  # report it, then carry on
        await browser.close()
    srv.shutdown()
    print(f'grown-ups check ({localsite.ENGINE}): errors:', errors)
    return not errors

if __name__ == '__main__':
    sys.exit(0 if asyncio.run(main()) else 1)
