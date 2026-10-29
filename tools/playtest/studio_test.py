"""Tests the Voice studio with a pretend microphone.

Chromium is told to use a WAV file as its microphone. The test opens the studio, records one clip,
checks it was trimmed and saved, exports the voice pack, imports it into a fresh browser profile,
and checks the game then plays the recording instead of Jenny. It fails on any page error or a file
the game needs that doesn't load.

    python tools/playtest/studio_test.py                 # uses sample-speech.wav (Jenny saying "like sun")
    python tools/playtest/studio_test.py my-speech.wav
"""
import asyncio, base64, json, os, sys, wave, io
from playwright.async_api import async_playwright
import localsite

OUT = os.path.join(os.path.dirname(__file__), 'out')
PORT = 8781


async def hold(page, sel, ms):
    b = await page.locator(sel).bounding_box()
    await page.mouse.move(b['x'] + 15, b['y'] + 15); await page.mouse.down(); await page.wait_for_timeout(ms); await page.mouse.up()


async def main(mic_wav):
    os.makedirs(OUT, exist_ok=True)
    srv = localsite.serve(PORT)
    ok = True
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
                                                f'--use-file-for-fake-audio-capture={mic_wav}', '--autoplay-policy=no-user-gesture-required'])
        ctx = await browser.new_context(viewport={'width': 1000, 'height': 800}, accept_downloads=True)
        page = await ctx.new_page(); errors = []; localsite.watch(page, errors, PORT, 'studio')
        await page.goto(f'{localsite.address(PORT)}index.html'); await page.wait_for_timeout(600)
        await hold(page, '#grownBtn', 1400)
        await page.click('#openStudio'); await page.wait_for_timeout(300)
        await page.screenshot(path=f'{OUT}/studio_open.png')
        label = await page.text_content('#recLabel')
        await page.click('#recBtn')
        await page.wait_for_function('!!ST.rec')  # recording starts once the microphone is ready
        for _ in range(40):
            await page.wait_for_timeout(250)
            if not await page.evaluate('!!ST.rec'): break
        await page.wait_for_timeout(600)
        info = await page.evaluate("(() => { const b = MY.local['s_s']; if (!b) return null; const v = new DataView(b); return { bytes: b.byteLength, rate: v.getUint32(24, true), secs: (b.byteLength - 44) / 2 / v.getUint32(24, true) }; })()")
        msg = await page.text_content('#recMsg')
        print('recorded clip for', repr(label), '->', info, '|', msg)
        ok &= bool(info) and 0.5 < info['secs'] < 2.5
        await page.screenshot(path=f'{OUT}/studio_recorded.png')
        tabs = await page.text_content('#studioTabs'); print('tabs:', tabs)
        async with page.expect_download() as dl:
            await page.click('#exportBtn')
        d = await dl.value; path = f'{OUT}/my-voice.json'; await d.save_as(path)
        pack = json.load(open(path)); print('exported pack:', pack['format'], len(pack['clips']), 'clips')
        wav = base64.b64decode(pack['clips']['s_s'])
        open(f'{OUT}/recorded_s_s.wav', 'wb').write(wav)
        # a fresh profile imports the pack, and the game should now use it
        ctx2 = await browser.new_context(viewport={'width': 1000, 'height': 800})
        p2 = await ctx2.new_page(); localsite.watch(p2, errors, PORT, 'studio import')
        await p2.goto(f'{localsite.address(PORT)}index.html'); await p2.wait_for_timeout(600)
        await hold(p2, '#grownBtn', 1400); await p2.click('#openStudio'); await p2.wait_for_timeout(200)
        await p2.set_input_files('#importInput', path); await p2.wait_for_timeout(800)
        print('import:', await p2.text_content('#packMsg'))
        await p2.click('#studioClose'); await p2.click('#testVoice'); await p2.wait_for_timeout(1500)
        route = await p2.evaluate('VO.route'); print('voice route after import:', route, '|', await p2.text_content('#voiceStatus'))
        ok &= route == 'mine'
        print('page errors:', errors)
        ok &= not errors
        await browser.close()
    srv.shutdown()
    return ok

if __name__ == '__main__':
    wav = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), 'sample-speech.wav')
    sys.exit(0 if asyncio.run(main(os.path.abspath(wav))) else 1)
