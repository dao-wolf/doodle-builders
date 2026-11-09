"""Tests the den, where a child looks after their hero, by touch alone.

For each hero: the den opens from the outposts screen; tapping the hero, feeding them and playing ball all work; and every
control is a big enough target. Dressing up changes the hero's costume on screen (the pictures differ), is remembered after the
page reloads, and shows in the level that follows. Lava also changes colour. Nothing the child does can end the den: it carries
on after every tap. A page error fails the test.

    python tools/playtest/den_test.py
    PLAYTEST_ENGINE=webkit python tools/playtest/den_test.py
"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
import localsite

OUT = os.path.join(os.path.dirname(__file__), 'out')
PORT = 8790
BASE = {'diff': 'easy', 'unlocked': 4, 'mode': 'both', 'move': 'manual', 'music': False}
CENTRE = "s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }"
HEROES = ('bob', 'henry', 'dragon', 'lava')
OUTFITS = ('none', 'halloween', 'christmas', 'easter')
MIN_TARGET = 44  # px: the smallest a touch target should be
# The hero as they are dressed now, drawn at a fixed moment on a canvas of its own, so the same dress always gives the same picture
PICTURE = """() => {
  const c = document.createElement('canvas'); c.width = 420; c.height = 420; const saved = ctx; ctx = c.getContext('2d');
  ctx.translate(210, 330); OUTFIT = outfitOf(S.char);
  LOOKS[S.char].draw({ x: 0, y: 0, squash: 0 }, 1, { face: { eyes: 'open', mouth: 'smile' } });
  ctx = saved; return c.toDataURL();
}"""


# Puts a magenta mark among the level's falling bits, draws a frame, and says whether the mark was painted: the den must not draw them
LEVEL_BITS_SHOW = """(() => {
  flakes = [{ x: 0.5, y: 0.2, s: 40, c: 'rgb(255,0,255)', v: 0 }]; draw(1);
  const k = SC * DPR, d = cv.getContext('2d').getImageData(Math.round((W * 0.5 + 20) * k), Math.round((GY * 0.2 + 20) * k), 1, 1).data;
  return d[0] === 255 && d[1] === 0 && d[2] === 255;
})()"""


async def tap(page, selector):
    await page.touchscreen.tap(*await page.evaluate(CENTRE, selector))


async def tap_world(page, x, y, sc):  # a tap on the canvas, at game coordinates
    await page.touchscreen.tap(x * sc, y * sc)


async def open_den(browser, errors, hero, name, query='season=none', settings=None):
    page = await browser.new_page(viewport={'width': 393, 'height': 760}, has_touch=True)
    localsite.watch(page, errors, PORT, name)
    await page.goto(f'{localsite.address(PORT)}index.html?{query}&speed=2.5')
    await page.evaluate(f"localStorage.setItem('bobs-outpost-settings', JSON.stringify({json.dumps({**BASE, **(settings or {})})}))"); await page.reload(); await page.wait_for_timeout(700)
    await tap(page, f'.char[data-char="{hero}"]'); await page.wait_for_timeout(400)
    await tap(page, '#denBtn'); await page.wait_for_timeout(600)
    return page


async def check_open_and_targets(page, errors, hero):
    if not await page.evaluate('den.on && !$("den").hidden && $("levels").hidden'): errors.append(f'{hero}: the den did not open')
    for selector in ('#denBack', '#denFeed', '#denPlay', '#denDress'):
        box = await page.locator(selector).bounding_box()
        if not box or min(box['width'], box['height']) < MIN_TARGET: errors.append(f'{hero}: {selector} is smaller than {MIN_TARGET}px: {box}')
    overflow = await page.evaluate('document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight')
    if overflow: errors.append(f'{hero}: the den scrolls')


async def check_pet(page, errors, hero):
    x, y = await page.evaluate('[denX(), GY - DEN_HEIGHT[S.char] * denScale() / 2]')
    await tap_world(page, x, y, await page.evaluate('SC')); await page.wait_for_timeout(150)
    if not await page.evaluate('den.happyT > 0 && den.hearts.length > 0'): errors.append(f'{hero}: tapping the hero did not make them happy')
    await page.wait_for_timeout(1800)


async def check_feed(page, errors, hero):
    await tap(page, '#denFeed'); await page.wait_for_timeout(300)
    if not await page.evaluate('den.snack'): errors.append(f'{hero}: feeding showed no snack')
    await page.wait_for_timeout(300); await tap(page, '#denFeed')  # a second tap while eating must not break anything
    for _ in range(40):
        if not await page.evaluate('den.snack'): break
        await page.wait_for_timeout(100)
    if await page.evaluate('den.snack'): errors.append(f'{hero}: the snack was never eaten')
    elif not await page.evaluate('den.happyT > 0'): errors.append(f'{hero}: the hero was not happy after eating')
    await page.wait_for_timeout(1500)


async def check_ball(page, errors, hero):
    await tap(page, '#denPlay'); await page.wait_for_timeout(300)
    if not await page.evaluate('den.ball'): errors.append(f'{hero}: Play showed no ball'); return
    await page.wait_for_timeout(2500)
    # stop the ball where it is (the hero's nudge and her head bounce would move it between the reading and the tap), then tap it at once
    where = await page.evaluate('(() => { const b = den.ball; b.vx = b.vy = 0; b.rest = -5; b.y = GY - ballRadius(); return { x: b.x, y: b.y, W, GY, SC }; })()')
    if not (0 <= where['x'] <= where['W'] and where['y'] <= where['GY']): errors.append(f'{hero}: the ball left the meadow: {where}')
    await tap_world(page, where['x'], where['y'], where['SC']); await page.wait_for_timeout(60)  # a tap kicks it
    if not await page.evaluate('den.ball.vy < 0'): errors.append(f'{hero}: tapping the ball did not kick it')
    await tap(page, '#denPlay'); await page.wait_for_timeout(200)
    if await page.evaluate('den.ball'): errors.append(f'{hero}: pressing Play again did not put the ball away')


async def check_dress(page, errors, hero):
    await tap(page, '#denDress'); await page.wait_for_timeout(200)
    if await page.evaluate('$("denTray").hidden'): errors.append(f'{hero}: the costume tray did not open'); return
    chips = await page.evaluate('[...document.querySelectorAll("#denTray .chip")].map(c => c.dataset.kind + ":" + c.dataset.value)')
    want = ['outfit:auto', 'outfit:none', 'outfit:halloween', 'outfit:christmas', 'outfit:easter'] + (['colour:sunny', 'colour:lagoon'] if hero == 'lava' else [])
    if chips != want: errors.append(f'{hero}: the tray holds {chips}, expected {want}')
    pictures = {}
    for outfit in OUTFITS:
        await tap(page, f'#denTray .chip[data-value="{outfit}"]'); await page.wait_for_timeout(300)
        pictures[outfit] = await page.evaluate(PICTURE)
        saved = await page.evaluate('S.outfits[S.char]')
        if saved != outfit: errors.append(f'{hero}: tapped {outfit}, saved {saved}')
        if await page.evaluate(f'$("denTray").querySelector(".chip[data-value=\\"{outfit}\\"]").getAttribute("aria-pressed")') != 'true': errors.append(f'{hero}: {outfit} is not marked as chosen')
    if len(set(pictures.values())) < len(OUTFITS): errors.append(f'{hero}: some costumes look the same')
    await page.screenshot(path=f'{OUT}/den_{localsite.ENGINE}_{hero}.png')


async def check_remembered_in_level(browser, errors, hero):
    page = await open_den(browser, errors, hero, f'{hero} remembered')
    await tap(page, '#denDress'); await tap(page, '#denTray .chip[data-value="easter"]'); await page.wait_for_timeout(300)
    await page.reload(); await page.wait_for_timeout(700)
    if await page.evaluate('outfitOf(S.char)') != 'easter': errors.append(f'{hero}: the costume was not remembered after a reload')
    await tap(page, f'.char[data-char="{hero}"]'); await page.wait_for_timeout(300); await tap(page, '.lvl[data-lvl="0"]'); await page.wait_for_timeout(1200)
    if await page.evaluate('OUTFIT') != 'easter': errors.append(f'{hero}: the level did not dress the hero in the chosen costume')
    await page.close()


async def check_lava_colour(browser, errors):
    page = await open_den(browser, errors, 'lava', 'lava colour')
    await tap(page, '#denDress'); await page.wait_for_timeout(200)
    await tap(page, '#denTray .chip[data-value="sunny"]'); await page.wait_for_timeout(300)
    sunny = await page.evaluate(PICTURE)
    await tap(page, '#denTray .chip[data-value="lagoon"]'); await page.wait_for_timeout(300)
    if await page.evaluate('S.lavaColour') != 'lagoon' or await page.evaluate('LP === LAVA_PALS.lagoon') is not True: errors.append('lava: the lagoon colours were not drawn')
    if await page.evaluate(PICTURE) == sunny: errors.append('lava: the two colours look the same')
    await page.reload(); await page.wait_for_timeout(700)
    if await page.evaluate('S.lavaColour') != 'lagoon': errors.append('lava: the colour was not remembered after a reload')
    await page.close()


async def check_weather(browser, errors):
    """The den has its own falling petals at Easter (not the last level's), and they move; with no season there are none."""
    page = await open_den(browser, errors, 'bob', 'easter petals', 'season=easter')
    before = await page.evaluate('den.bits.map(b => b.y)'); await page.wait_for_timeout(800); after = await page.evaluate('den.bits.map(b => b.y)')
    if not before or before == after: errors.append(f'Easter den: petals {"missing" if not before else "do not move"}')
    await page.close()
    page = await open_den(browser, errors, 'bob', 'plain den', 'season=none')
    if await page.evaluate('den.bits.length'): errors.append('plain den: falling bits with no season')
    await tap(page, '#denBack'); await page.evaluate("S.char = 'bob'; startLevel(3)"); await page.wait_for_timeout(500)  # a snowy level, then the den again
    await page.evaluate('goTitle(); showLevels(); openDen()'); await page.wait_for_timeout(400)
    if await page.evaluate('den.bits.length'): errors.append("plain den: the last level's snow hangs over the den")
    if await page.evaluate(LEVEL_BITS_SHOW): errors.append("plain den: the den draws the last level's falling bits")
    await page.close()


async def check_seasons_off(browser, errors):
    """With the grown-ups' Seasonal themes set to Off nobody wears a costume, in the den or in a level, and the costume buttons are
    hidden (Lava keeps her colours; the others have nothing left to choose, so no Dress button). The picks stay saved and come back."""
    picks = {'outfits': {'lava': 'halloween', 'bob': 'easter'}, 'lavaColour': 'lagoon', 'seasons': 'off'}
    for hero, buttons in (('bob', []), ('lava', ['colour:sunny', 'colour:lagoon'])):
        page = await open_den(browser, errors, hero, f'{hero} seasons off', 'speed=2.5', picks)  # no ?season= override: the setting decides
        if await page.evaluate('outfitOf(S.char)') is not None: errors.append(f'{hero}: wears {await page.evaluate("outfitOf(S.char)")} in the den with seasons Off')
        if await page.evaluate('$("denDress").hidden') != (not buttons): errors.append(f'{hero}: the Dress button should be {"hidden" if not buttons else "shown"} with seasons Off')
        chips = await page.evaluate('[...document.querySelectorAll("#denTray .chip")].map(c => c.dataset.kind + ":" + c.dataset.value)')
        if chips != buttons: errors.append(f'{hero}: the tray holds {chips} with seasons Off, expected {buttons}')
        if await page.evaluate('S.outfits[S.char]') != picks['outfits'][hero]: errors.append(f'{hero}: the saved costume was lost')
        await tap(page, '#denBack'); await page.wait_for_timeout(300)
        await tap(page, '.lvl[data-lvl="0"]'); await page.wait_for_timeout(1200)
        if await page.evaluate('OUTFIT') is not None: errors.append(f'{hero}: wears {await page.evaluate("OUTFIT")} in a level with seasons Off')
        await page.evaluate("S.seasons = 'auto'; saveSettings()"); await page.reload(); await page.wait_for_timeout(700)  # the grown-up changes it back
        if await page.evaluate('outfitOf(S.char)') != picks['outfits'][hero]: errors.append(f'{hero}: the saved costume did not come back when Off was changed')
        await page.close()


async def check_sideways_reach(browser, errors):
    """On a phone held sideways (844x390 is an iPhone, 667x375 an older one) the outposts screen is taller than the screen, on main too:
    Back is below the fold there as well. So the Den button is reached by scrolling the screen. It must be reachable that way, a tap
    there must open the den, and the den itself must fit (check_turned). Moving the button onto the first screen is the owner's call;
    if that happens, change this to expect it to be in view at once."""
    for w, h in ((844, 390), (667, 375)):
        page = await browser.new_page(viewport={'width': w, 'height': h}, has_touch=True)
        localsite.watch(page, errors, PORT, f'sideways {w}x{h}')
        await page.goto(f'{localsite.address(PORT)}index.html?season=none&speed=2.5')
        await page.evaluate(f"localStorage.setItem('bobs-outpost-settings', JSON.stringify({json.dumps(BASE)}))"); await page.reload(); await page.wait_for_timeout(700)
        await page.evaluate("S.char = 'lava'; showLevels()"); await page.wait_for_timeout(300)
        box = await page.locator('#denBtn').bounding_box()
        if not box: errors.append(f'{w}x{h}: no Den button on the outposts screen'); await page.close(); continue
        if box['y'] + box['height'] > h:  # below the bottom: scroll the screen like a finger would
            await page.mouse.move(w / 2, h / 2); await page.mouse.wheel(0, 500); await page.wait_for_timeout(400)
            box = await page.locator('#denBtn').bounding_box()
        if box['y'] < 0 or box['y'] + box['height'] > h or box['x'] < 0 or box['x'] + box['width'] > w: errors.append(f'{w}x{h}: the Den button cannot be scrolled into view: {box}')
        else:
            await tap(page, '#denBtn'); await page.wait_for_timeout(500)
            if not await page.evaluate('den.on'): errors.append(f'{w}x{h}: tapping the Den button after scrolling did not open the den')
        await page.close()


async def check_turned(browser, errors):
    """Turning the phone on its side keeps the hero, the ball and the buttons on screen, and the page doesn't scroll."""
    page = await open_den(browser, errors, 'lava', 'turned')
    await tap(page, '#denPlay'); await page.wait_for_timeout(500)
    await page.set_viewport_size({'width': 844, 'height': 390}); await page.wait_for_timeout(800)
    where = await page.evaluate('({ x: denX(), top: GY - DEN_HEIGHT[S.char] * denScale(), ball: den.ball && den.ball.x, W, H, GY })')
    if not (0 < where['x'] < where['W'] and where['top'] > 0 and 0 <= where['ball'] <= where['W']): errors.append(f'turned on its side, something is off screen: {where}')
    for selector in ('#denBack', '#denFeed', '#denPlay', '#denDress'):
        box = await page.locator(selector).bounding_box()
        if not box or box['y'] < 0 or box['y'] + box['height'] > 390 or box['x'] < 0 or box['x'] + box['width'] > 844: errors.append(f'turned on its side, {selector} is off screen: {box}')
    await page.close()


async def check_back(page, errors, hero):
    await tap(page, '#denBack'); await page.wait_for_timeout(400)
    if await page.evaluate('den.on || $("levels").hidden'): errors.append(f'{hero}: Back did not return to the outposts')


async def check_hero(browser, errors, hero):
    page = await open_den(browser, errors, hero, f'{hero} den')
    for check in (check_open_and_targets, check_pet, check_feed, check_ball, check_dress, check_back):
        try: await check(page, errors, hero)
        except Exception as e: errors.append(f'{hero}: {check.__name__} stopped: {str(e).splitlines()[0]}')
    await page.close()


async def main():
    os.makedirs(OUT, exist_ok=True)
    srv = localsite.serve(PORT); errors = []
    async with async_playwright() as p:
        browser = await localsite.launch(p)
        for hero in HEROES: await check_hero(browser, errors, hero)
        for check in (check_lava_colour, check_weather, check_turned, check_seasons_off, check_sideways_reach):
            try: await check(browser, errors)
            except Exception as e: errors.append(f'{check.__name__} stopped: {str(e).splitlines()[0]}')
        for hero in ('bob', 'lava'):
            try: await check_remembered_in_level(browser, errors, hero)
            except Exception as e: errors.append(f'{hero}: remembered check stopped: {str(e).splitlines()[0]}')
        await browser.close()
    srv.shutdown()
    print(f'den ({localsite.ENGINE}): errors:', errors)
    return not errors

if __name__ == '__main__':
    sys.exit(0 if asyncio.run(main()) else 1)
