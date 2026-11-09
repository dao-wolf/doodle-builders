"""Tests the den, where a child looks after their hero, by touch alone.

For each hero: the den opens from the outposts screen; tapping the hero, feeding them and playing ball all work; and every
control is a big enough target. Dressing up changes the hero's costume on screen (the pictures differ), is remembered after the
page reloads, and shows in the level that follows. Lava also changes colour. Nothing the child does can end the den: it carries
on after every tap. A page error fails the test.

    python tools/playtest/den_test.py
    PLAYTEST_ENGINE=webkit python tools/playtest/den_test.py
"""
import asyncio, json, os, sys
from typing import NamedTuple, Optional
from playwright.async_api import async_playwright
import localsite

OUT = os.path.join(os.path.dirname(__file__), 'out')
PORT = 8790
BASE = {'diff': 'easy', 'unlocked': 4, 'mode': 'both', 'move': 'manual', 'music': False}
PHONE = {'width': 393, 'height': 760}
SEASONS_OFF = {'outfits': {'lava': 'halloween', 'bob': 'easter'}, 'lavaColour': 'lagoon', 'seasons': 'off'}  # costumes picked while seasons were on, then Seasonal themes set to Off
CENTRE = "s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }"
HEROES = ('bob', 'henry', 'dragon', 'lava')
OUTFITS = ('none', 'halloween', 'christmas', 'easter')
BUTTONS = ('#denBack', '#denFeed', '#denPlay', '#denDress')
SIDEWAYS_SIZES = ((844, 390), (667, 375))  # a phone held sideways: an iPhone, and an older one
OUTPOSTS_SCREEN = ('#lvlBack', '#denBtn', '.lvl[data-lvl="0"]', '.lvl[data-lvl="3"]')  # what must be in view at once: the buttons, and the first and last outposts
MIN_TARGET = 44  # px: the smallest a touch target should be
CHIPS = '[...document.querySelectorAll("#denTray .chip")].map(c => c.dataset.kind + ":" + c.dataset.value)'
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
# Whether the element is shown (it has a size) and lies wholly inside the window
IN_VIEW = """s => {
  const e = document.querySelector(s); if (!e) return false;
  const r = e.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
}"""
# Where the hero and ball are, and whether both are on screen (a ball that is missing fails): { ok, where }
TURNED = """(() => {
  const where = { x: denX(), top: GY - DEN_HEIGHT[S.char] * denScale(), ball: den.ball && den.ball.x, W, H, GY };
  const ball = typeof where.ball === 'number' && 0 <= where.ball && where.ball <= W;
  return { ok: 0 < where.x && where.x < W && where.top > 0 && ball, where };
})()"""


class Visit(NamedTuple):  # one page to open: the hero, a label for error reports, the query string, any saved settings on top of BASE, the window size
    hero: str
    name: str
    query: str = 'season=none'
    settings: Optional[dict] = None
    size: dict = PHONE


async def tap(page, selector):
    await page.touchscreen.tap(*await page.evaluate(CENTRE, selector))


async def tap_world(page, x, y, sc):  # a tap on the canvas, at game coordinates
    await page.touchscreen.tap(x * sc, y * sc)


def expect(errors, ok, message):  # records a failure unless ok
    if not ok: errors.append(message)


async def attempt(errors, label, running):  # a check that throws counts as an error too, and the other checks still run
    try: await running
    except Exception as e: errors.append(f'{label} stopped: {str(e).splitlines()[0]}')


async def in_view(page, selector):  # shown, and wholly inside the window
    return await page.evaluate(IN_VIEW, selector)


def is_target(box):  # there, and at least MIN_TARGET px each way
    return bool(box) and min(box['width'], box['height']) >= MIN_TARGET


def in_meadow(where):  # the ball is inside the meadow's width and not below the ground
    return 0 <= where['x'] <= where['W'] and where['y'] <= where['GY']


def colour_chips(hero):  # Lava alone has colours to choose
    return ['colour:sunny', 'colour:lagoon'] if hero == 'lava' else []


async def wait_until_gone(page, expression, polls=40):  # polls every 100 ms until the expression is falsy, or for polls goes
    while polls > 0 and await page.evaluate(expression):
        await page.wait_for_timeout(100); polls -= 1


async def start_page(browser, errors, visit):  # a fresh page with the saved settings in place and the game loaded
    page = await browser.new_page(viewport=visit.size, has_touch=True)
    localsite.watch(page, errors, PORT, visit.name)
    await page.goto(f'{localsite.address(PORT)}index.html?{visit.query}&speed=2.5')
    await page.evaluate(f"localStorage.setItem('bobs-outpost-settings', JSON.stringify({json.dumps({**BASE, **(visit.settings or {})})}))"); await page.reload(); await page.wait_for_timeout(700)
    return page


async def open_den(browser, errors, visit):
    page = await start_page(browser, errors, visit)
    await tap(page, f'.char[data-char="{visit.hero}"]'); await page.wait_for_timeout(400)
    await tap(page, '#denBtn'); await page.wait_for_timeout(600)
    return page


async def check_open_and_targets(page, errors, hero):
    expect(errors, await page.evaluate('den.on && !$("den").hidden && $("levels").hidden'), f'{hero}: the den did not open')
    for selector in BUTTONS:
        box = await page.locator(selector).bounding_box()
        expect(errors, is_target(box), f'{hero}: {selector} is smaller than {MIN_TARGET}px: {box}')
    scrolls = await page.evaluate('document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight')
    expect(errors, not scrolls, f'{hero}: the den scrolls')


async def check_pet(page, errors, hero):
    x, y = await page.evaluate('[denX(), GY - DEN_HEIGHT[S.char] * denScale() / 2]')
    await tap_world(page, x, y, await page.evaluate('SC')); await page.wait_for_timeout(150)
    expect(errors, await page.evaluate('den.happyT > 0 && den.hearts.length > 0'), f'{hero}: tapping the hero did not make them happy')
    await page.wait_for_timeout(1800)


async def check_feed(page, errors, hero):
    await tap(page, '#denFeed'); await page.wait_for_timeout(300)
    expect(errors, await page.evaluate('den.snack'), f'{hero}: feeding showed no snack')
    await page.wait_for_timeout(300); await tap(page, '#denFeed')  # a second tap while eating must not break anything
    await wait_until_gone(page, 'den.snack')
    if await page.evaluate('den.snack'): errors.append(f'{hero}: the snack was never eaten')
    else: expect(errors, await page.evaluate('den.happyT > 0'), f'{hero}: the hero was not happy after eating')
    await page.wait_for_timeout(1500)


async def check_ball(page, errors, hero):
    await tap(page, '#denPlay'); await page.wait_for_timeout(300)
    if not await page.evaluate('den.ball'): errors.append(f'{hero}: Play showed no ball'); return
    await page.wait_for_timeout(2500)
    # stop the ball where it is (the hero's nudge and her head bounce would move it between the reading and the tap), then tap it at once
    where = await page.evaluate('(() => { const b = den.ball; b.vx = b.vy = 0; b.rest = -5; b.y = GY - ballRadius(); return { x: b.x, y: b.y, W, GY, SC }; })()')
    expect(errors, in_meadow(where), f'{hero}: the ball left the meadow: {where}')
    await tap_world(page, where['x'], where['y'], where['SC']); await page.wait_for_timeout(60)  # a tap kicks it
    expect(errors, await page.evaluate('den.ball.vy < 0'), f'{hero}: tapping the ball did not kick it')
    await tap(page, '#denPlay'); await page.wait_for_timeout(200)
    expect(errors, not await page.evaluate('den.ball'), f'{hero}: pressing Play again did not put the ball away')


async def choose_outfit(page, errors, hero, outfit):  # taps one costume, checks it was saved and marked as chosen, and returns the hero's picture
    await tap(page, f'#denTray .chip[data-value="{outfit}"]'); await page.wait_for_timeout(300)
    picture = await page.evaluate(PICTURE)
    saved = await page.evaluate('S.outfits[S.char]')
    expect(errors, saved == outfit, f'{hero}: tapped {outfit}, saved {saved}')
    pressed = await page.evaluate(f'$("denTray").querySelector(".chip[data-value=\\"{outfit}\\"]").getAttribute("aria-pressed")')
    expect(errors, pressed == 'true', f'{hero}: {outfit} is not marked as chosen')
    return picture


async def check_dress(page, errors, hero):
    await tap(page, '#denDress'); await page.wait_for_timeout(200)
    if await page.evaluate('$("denTray").hidden'): errors.append(f'{hero}: the costume tray did not open'); return
    chips = await page.evaluate(CHIPS)
    want = ['outfit:auto', 'outfit:none', 'outfit:halloween', 'outfit:christmas', 'outfit:easter'] + colour_chips(hero)
    expect(errors, chips == want, f'{hero}: the tray holds {chips}, expected {want}')
    pictures = set()
    for outfit in OUTFITS: pictures.add(await choose_outfit(page, errors, hero, outfit))
    expect(errors, len(pictures) >= len(OUTFITS), f'{hero}: some costumes look the same')
    await page.screenshot(path=f'{OUT}/den_{localsite.ENGINE}_{hero}.png')


async def check_remembered_in_level(browser, errors, hero):
    page = await open_den(browser, errors, Visit(hero, f'{hero} remembered'))
    await tap(page, '#denDress'); await tap(page, '#denTray .chip[data-value="easter"]'); await page.wait_for_timeout(300)
    await page.reload(); await page.wait_for_timeout(700)
    expect(errors, await page.evaluate('outfitOf(S.char)') == 'easter', f'{hero}: the costume was not remembered after a reload')
    await tap(page, f'.char[data-char="{hero}"]'); await page.wait_for_timeout(300); await tap(page, '.lvl[data-lvl="0"]'); await page.wait_for_timeout(1200)
    expect(errors, await page.evaluate('OUTFIT') == 'easter', f'{hero}: the level did not dress the hero in the chosen costume')
    await page.close()


async def check_lava_colour(browser, errors):
    page = await open_den(browser, errors, Visit('lava', 'lava colour'))
    await tap(page, '#denDress'); await page.wait_for_timeout(200)
    await tap(page, '#denTray .chip[data-value="sunny"]'); await page.wait_for_timeout(300)
    sunny = await page.evaluate(PICTURE)
    await tap(page, '#denTray .chip[data-value="lagoon"]'); await page.wait_for_timeout(300)
    drawn = await page.evaluate('S.lavaColour') == 'lagoon' and await page.evaluate('LP === LAVA_PALS.lagoon') is True
    expect(errors, drawn, 'lava: the lagoon colours were not drawn')
    expect(errors, await page.evaluate(PICTURE) != sunny, 'lava: the two colours look the same')
    await page.reload(); await page.wait_for_timeout(700)
    expect(errors, await page.evaluate('S.lavaColour') == 'lagoon', 'lava: the colour was not remembered after a reload')
    await page.close()


async def check_petals(browser, errors):  # Easter: the den has petals, and they move
    page = await open_den(browser, errors, Visit('bob', 'easter petals', 'season=easter'))
    before = await page.evaluate('den.bits.map(b => b.y)'); await page.wait_for_timeout(800); after = await page.evaluate('den.bits.map(b => b.y)')
    expect(errors, before, 'Easter den: petals missing')
    if before: expect(errors, before != after, 'Easter den: petals do not move')
    await page.close()


async def check_no_petals(browser, errors):  # no season: no bits in the den, and none left over from the last level
    page = await open_den(browser, errors, Visit('bob', 'plain den', 'season=none'))
    expect(errors, not await page.evaluate('den.bits.length'), 'plain den: falling bits with no season')
    await tap(page, '#denBack'); await page.evaluate("S.char = 'bob'; startLevel(3)"); await page.wait_for_timeout(500)  # a snowy level, then the den again
    await page.evaluate('goTitle(); showLevels(); openDen()'); await page.wait_for_timeout(400)
    expect(errors, not await page.evaluate('den.bits.length'), "plain den: the last level's snow hangs over the den")
    expect(errors, not await page.evaluate(LEVEL_BITS_SHOW), "plain den: the den draws the last level's falling bits")
    await page.close()


async def check_weather(browser, errors):
    """The den has its own falling petals at Easter (not the last level's), and they move; with no season there are none."""
    await check_petals(browser, errors)
    await check_no_petals(browser, errors)


async def check_off_in_den(page, errors, hero):  # in the den with seasons Off: no costume, and only Lava's colours left to choose
    buttons = colour_chips(hero)
    worn = await page.evaluate('outfitOf(S.char)')
    expect(errors, worn is None, f'{hero}: wears {worn} in the den with seasons Off')
    hidden = await page.evaluate('$("denDress").hidden')
    expect(errors, hidden == (not buttons), f'{hero}: the Dress button should be {"hidden" if not buttons else "shown"} with seasons Off')
    chips = await page.evaluate(CHIPS)
    expect(errors, chips == buttons, f'{hero}: the tray holds {chips} with seasons Off, expected {buttons}')
    expect(errors, await page.evaluate('S.outfits[S.char]') == SEASONS_OFF['outfits'][hero], f'{hero}: the saved costume was lost')


async def check_off_for(browser, errors, hero):  # one hero: the den, then a level, then the setting changed back
    page = await open_den(browser, errors, Visit(hero, f'{hero} seasons off', 'speed=2.5', SEASONS_OFF))  # no ?season= override: the setting decides
    await check_off_in_den(page, errors, hero)
    await tap(page, '#denBack'); await page.wait_for_timeout(300)
    await tap(page, '.lvl[data-lvl="0"]'); await page.wait_for_timeout(1200)
    worn = await page.evaluate('OUTFIT')
    expect(errors, worn is None, f'{hero}: wears {worn} in a level with seasons Off')
    await page.evaluate("S.seasons = 'auto'; saveSettings()"); await page.reload(); await page.wait_for_timeout(700)  # the grown-up changes it back
    expect(errors, await page.evaluate('outfitOf(S.char)') == SEASONS_OFF['outfits'][hero], f'{hero}: the saved costume did not come back when Off was changed')
    await page.close()


async def check_seasons_off(browser, errors):
    """With the grown-ups' Seasonal themes set to Off nobody wears a costume, in the den or in a level, and the costume buttons are
    hidden (Lava keeps her colours; the others have nothing left to choose, so no Dress button). The picks stay saved and come back."""
    for hero in ('bob', 'lava'): await check_off_for(browser, errors, hero)


async def tap_den_button(page, errors, size):  # a tap on Den opens the den (only if the button is in view to be tapped)
    if not await in_view(page, '#denBtn'): return
    await tap(page, '#denBtn'); await page.wait_for_timeout(500)
    expect(errors, await page.evaluate('den.on'), f'{size}: tapping the Den button did not open the den')


async def check_den_reach(browser, errors, w, h):  # one window size: all of the outposts screen is in view at once, and Den opens the den
    visit = Visit('lava', f'sideways {w}x{h}', size={'width': w, 'height': h})
    page = await start_page(browser, errors, visit)
    await page.evaluate(f"S.char = '{visit.hero}'; showLevels()"); await page.wait_for_timeout(300)
    for selector in OUTPOSTS_SCREEN: expect(errors, await in_view(page, selector), f'{w}x{h}: {selector} is not in view without scrolling')
    await tap_den_button(page, errors, f'{w}x{h}')
    await page.close()


async def check_sideways_reach(browser, errors):
    """On a phone held sideways (844x390 is an iPhone, 667x375 an older one) the four outposts sit in one row, so Back, Den and the
    outposts are all in view at once, without scrolling, and a tap on Den opens the den. (Before the one-row layout, Back and Den
    were below the fold there, on main too.) The den itself must fit as well: see check_turned."""
    for w, h in SIDEWAYS_SIZES: await check_den_reach(browser, errors, w, h)


async def check_on_screen(page, errors, selector):
    box = await page.locator(selector).bounding_box()
    expect(errors, await in_view(page, selector), f'turned on its side, {selector} is off screen: {box}')


async def check_turned(browser, errors):
    """Turning the phone on its side keeps the hero, the ball and the buttons on screen, and the page doesn't scroll."""
    page = await open_den(browser, errors, Visit('lava', 'turned'))
    await tap(page, '#denPlay'); await page.wait_for_timeout(500)
    await page.set_viewport_size({'width': 844, 'height': 390}); await page.wait_for_timeout(800)
    seen = await page.evaluate(TURNED)
    expect(errors, seen['ok'], f'turned on its side, something is off screen: {seen["where"]}')
    for selector in BUTTONS: await check_on_screen(page, errors, selector)
    await page.close()


async def check_back(page, errors, hero):
    await tap(page, '#denBack'); await page.wait_for_timeout(400)
    expect(errors, not await page.evaluate('den.on || $("levels").hidden'), f'{hero}: Back did not return to the outposts')


async def check_hero(browser, errors, hero):
    page = await open_den(browser, errors, Visit(hero, f'{hero} den'))
    for check in (check_open_and_targets, check_pet, check_feed, check_ball, check_dress, check_back):
        await attempt(errors, f'{hero}: {check.__name__}', check(page, errors, hero))
    await page.close()


async def main():
    os.makedirs(OUT, exist_ok=True)
    srv = localsite.serve(PORT); errors = []
    async with async_playwright() as p:
        browser = await localsite.launch(p)
        for hero in HEROES: await check_hero(browser, errors, hero)
        for check in (check_lava_colour, check_weather, check_turned, check_seasons_off, check_sideways_reach):
            await attempt(errors, check.__name__, check(browser, errors))
        for hero in ('bob', 'lava'):
            await attempt(errors, f'{hero}: remembered check', check_remembered_in_level(browser, errors, hero))
        await browser.close()
    srv.shutdown()
    print(f'den ({localsite.ENGINE}): errors:', errors)
    return not errors

if __name__ == '__main__':
    sys.exit(0 if asyncio.run(main()) else 1)
