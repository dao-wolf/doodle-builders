"""Tests that the playtests make no sound, in every browser engine.

Firefox and WebKit would play the game's sound through the computer's speakers (Chromium is muted by
its launch flags). localsite.launch() silences all three; this test fails if that stops being true:

  1. No script starts a browser except through localsite.launch(). It is a check of the scripts' text,
     so a new script can't forget.
  2. In each engine, a page from browser.new_page() and a page from browser.new_context() both have the
     silencer. Once the game starts its sound, the connections to the speakers have gone through a gain
     of 0 (window.__hushed counts them), and a line spoken by the device voice is told to use volume 0.

It cannot hear anything: the silencer is what it checks, and the silencer works the same in every engine.

    python tools/playtest/silence_test.py             # all three engines
    python tools/playtest/silence_test.py webkit      # or just the ones named
"""
import asyncio, glob, os, re, sys
from playwright.async_api import async_playwright
import localsite

PORT = 8789
HERE = os.path.dirname(__file__)
SETTINGS = "localStorage.setItem('bobs-outpost-settings', JSON.stringify({unlocked:4, mode:'both', move:'auto'}))"
SPEAK = "() => { const u = new SpeechSynthesisUtterance('a'); u.volume = 1; speechSynthesis.speak(u); const v = u.volume; speechSynthesis.cancel(); return v; }"
BYPASS = re.compile(r'\.(chromium|firefox|webkit)\.launch\(')


def launched_elsewhere():
    """The scripts that start a browser themselves, which would make it loud."""
    return [os.path.basename(f) for f in sorted(glob.glob(f'{HERE}/*.py'))
            if os.path.basename(f) != 'localsite.py' and BYPASS.search(open(f).read())]


async def silent(page, label, errors):
    await page.goto(f'{localsite.address(PORT)}index.html')
    await page.evaluate(SETTINGS); await page.reload(); await page.wait_for_timeout(500)
    if await page.evaluate('window.__hushed') != 0:
        errors.append(f'{label}: the silencer is not in the page'); return
    await page.click('.char[data-char="bob"]'); await page.wait_for_timeout(300)
    await page.click('.lvl[data-lvl="0"]'); await page.wait_for_timeout(1500)  # the click also starts the sound
    hushed = await page.evaluate('window.__hushed')
    if not hushed: errors.append(f'{label}: the game started its sound, but nothing went through the silencer')
    if await page.evaluate(SPEAK) != 0: errors.append(f'{label}: the device voice was not told to use volume 0')
    print(f'silence {label}: {hushed} connection(s) to the speakers went through a gain of 0')


async def main(engines):
    errors = [f'{name} starts a browser itself instead of calling localsite.launch()' for name in launched_elsewhere()]
    srv = localsite.serve(PORT)
    async with async_playwright() as p:
        for engine in engines:
            browser = await localsite.launch(p, engine=engine)
            await silent(await browser.new_page(), f'{engine} new_page', errors)
            await silent(await (await browser.new_context(viewport={'width': 390, 'height': 844})).new_page(), f'{engine} new_context', errors)
            await browser.close()
    srv.shutdown()
    print('silence: errors:', errors)
    return not errors

if __name__ == '__main__':
    names = sys.argv[1:] or ['chromium', 'firefox', 'webkit']
    sys.exit(0 if asyncio.run(main(names)) else 1)
