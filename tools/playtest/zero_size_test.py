"""Tests that the game keeps drawing after it starts with no window size.

A hidden frame, or a phone web view before layout, can load the page with no width or height. The test
loads the game in a 0x0 viewport, then gives it a phone-sized one, and fails if the game stops drawing,
the page throws an error, or a file the game needs doesn't load.

    python tools/playtest/zero_size_test.py
"""
import asyncio, os, sys
from playwright.async_api import async_playwright
import localsite

OUT = os.path.join(os.path.dirname(__file__), 'out')
PORT = 8782


async def main():
    os.makedirs(OUT, exist_ok=True)
    srv = localsite.serve(PORT)
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 0, 'height': 0}); errors = []
        localsite.watch(page, errors, PORT, 'zero-size')
        await page.goto(f'{localsite.address(PORT)}index.html'); await page.wait_for_timeout(800)
        await page.set_viewport_size({'width': 390, 'height': 844}); await page.wait_for_timeout(800)
        t = await page.evaluate('last'); await page.wait_for_timeout(400)  # `last` is the time of the latest frame
        if await page.evaluate('last') == t: errors.append('the game stopped drawing')
        await page.screenshot(path=f'{OUT}/zero-size_title.png')
        print('zero-size: errors:', errors)
        await browser.close()
    srv.shutdown()
    return not errors

if __name__ == '__main__':
    sys.exit(0 if asyncio.run(main()) else 1)
