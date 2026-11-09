"""Automated playthrough of Bob's Outpost in a headless browser (Chromium unless PLAYTEST_ENGINE names another).

A robot player picks a hero, walks (with the arrow keys in manual mode), answers every question
(sometimes picking a wrong answer first), blows Nibblers away (or is slow to on purpose) and builds the outpost.
It reports how each piece ended up and saves screenshots to tools/playtest/out/. A scenario fails if the
outpost isn't finished, the page throws an error, a file the game needs doesn't load, or (in manual mode)
holding the gear button doesn't pause the game or tapping the ground doesn't walk the hero.
The seasonal scenarios force a look with ?season= or ?date=, and fail if the start screen shows the wrong look
or its picture button doesn't switch the look off and on.

    pip install playwright && playwright install chromium
    python tools/playtest/playtest.py                 # all scenarios
    python tools/playtest/playtest.py phone-manual    # one scenario
    PLAYTEST_ENGINE=firefox python tools/playtest/playtest.py   # in Firefox (or webkit, Safari's engine)
"""
import asyncio, json, os, sys, time
from dataclasses import dataclass, field
from typing import Any, NamedTuple, Optional
from playwright.async_api import async_playwright
import localsite
from gate_test import pass_gate

OUT = os.path.join(os.path.dirname(__file__), 'out')
PORT = 8780
SPEED = 2.5

SCENARIOS = {  # name: (width, height, hero, difficulty, level, movement, style[, (query, the look it should show)[, extra settings]])
    'phone-manual': (390, 844, 'bob', 'easy', 0, 'manual', 'defend'),
    'desktop-auto-medium': (1280, 720, 'henry', 'medium', 1, 'auto', 'lazy'),
    'phone-hard-manual': (390, 844, 'henry', 'hard', 2, 'manual', 'lazy'),
    'desktop-hard-auto': (1280, 720, 'bob', 'hard', 3, 'auto', 'defend'),
    'halloween': (390, 844, 'henry', 'medium', 0, 'manual', 'lazy', ('season=halloween', 'halloween')),
    'christmas': (1280, 720, 'bob', 'easy', 3, 'auto', 'defend', ('date=2026-12-24', 'christmas')),
    'normal-look': (1280, 720, 'henry', 'easy', 2, 'auto', 'defend', ('season=none', '')),
    'dragon-christmas': (390, 844, 'dragon', 'medium', 1, 'manual', 'defend', ('date=2026-12-24', 'christmas')),
    'dragon-halloween': (1280, 720, 'dragon', 'hard', 3, 'auto', 'lazy', ('season=halloween', 'halloween')),
    'lava-easter': (390, 844, 'lava', 'medium', 0, 'manual', 'defend', ('date=2027-03-28', 'easter')),
    'lava-lagoon-halloween': (1280, 720, 'lava', 'hard', 3, 'auto', 'lazy', ('season=halloween', 'halloween'), {'lavaColour': 'lagoon'}),
    'bob-easter': (1280, 720, 'bob', 'easy', 1, 'auto', 'defend', ('season=easter', 'easter')),
}


class Scenario(NamedTuple):
    """One row of SCENARIOS, with a name for each field."""
    w: int
    h: int
    hero: str
    diff: str
    level: int
    move: str  # 'manual' (arrow keys) or 'auto'
    style: str  # 'defend' (blows Nibblers away quickly) or 'lazy' (slow to, unless one has stolen a piece)
    season: tuple = ('', None)  # (the query to add to the address, the look the start screen should show, or None to skip the check)
    settings: Optional[dict] = None  # extra settings to save


STATE = '''() => ({ phase, type: round && round.type, target: round && round.target, SC, status: status.slice(), GY, camX,
  heroX: hero.x - camX,
  items: items.filter(i => i.state === 'idle' && now >= i.born).map(i => ({ x: i.x, y: i.y, val: i.val, kind: i.kind })),
  nibs: nibs.map(n => ({ state: n.state, x: n.x - camX })),
  box: carry ? pieceBoxScreen(carry.piece) : null, fin: !document.getElementById('finish').hidden,
  finText: document.getElementById('finText').textContent, paused: isPaused() })'''


async def answer(page, st):
    """Taps a gem when counting, otherwise the right answer (now and then a wrong one first)."""
    sc = st['SC']
    if st['type'] == 'count':
        if st['items']: g = st['items'][0]; await page.mouse.click(g['x'] * sc, g['y'] * sc)
        return
    right = [x for x in st['items'] if x['val'] == st['target']]
    if right:
        await pick(page, right[0], [x for x in st['items'] if x['val'] != st['target']], sc)


async def pick(page, right, wrong, sc):
    """Taps the right block, after a wrong one about one time in five."""
    if wrong and int(time.time()) % 5 == 0:
        await page.mouse.click(wrong[0]['x'] * sc, (wrong[0]['y'] - 32) * sc); await page.wait_for_timeout(300)
    await page.mouse.click(right['x'] * sc, (right['y'] - 32) * sc)


async def check_pause_and_tap(page, st, shot, log, errors):
    """Holding the gear button must pause the game (the grown-ups check, then the settings), and tapping the ground
    ahead must walk the hero."""
    gear = await page.locator('#gearBtn').bounding_box()
    await page.mouse.move(gear['x'] + 20, gear['y'] + 20); await page.mouse.down(); await page.wait_for_timeout(900); await page.mouse.up()
    a = await page.evaluate('hero.x'); await page.wait_for_timeout(600); b = await page.evaluate('hero.x')
    paused = await page.evaluate('isPaused()') and a == b
    await pass_gate(page, touch=False); await shot('settings_ingame'); await page.click('#setDone')
    await page.mouse.click((st['heroX'] + 150) * st['SC'], (st['GY'] + 10) * st['SC']); await page.wait_for_timeout(500)
    moved = await page.evaluate('hero.x') > b + 20
    log.extend([('pause-check', 'paused' if paused else 'NOT PAUSED'), ('tap-walk', 'moved' if moved else 'DID NOT MOVE')])
    errors.extend(p for ok, p in ((paused, 'holding the gear button did not pause the game'),
                                  (moved, 'tapping the ground did not walk the hero')) if not ok)


async def check_season(page, name, season, errors):
    """The start screen shows the scenario's look, and its picture button switches the look off and back on.
    Scenarios without a season leave the look to today's date and aren't checked."""
    look = season[1]
    if look is None: return
    seen = [await page.evaluate('document.body.dataset.season')]
    for _ in range(2 if await page.is_visible('#seasonBtn') else 0):  # with no season there must be no button
        await page.wait_for_timeout(800)  # two separate taps: a quicker second tap is a double tap, which counts once
        await page.click('#seasonBtn'); seen.append(await page.evaluate('document.body.dataset.season'))
    await page.screenshot(path=f'{OUT}/{name}_title.png')
    want = [look, '', look] if look else ['']
    if seen != want: errors.append(f'start screen looks {seen}, expected {want}')


def stored_settings(diff, move, extra):
    """The settings a scenario saves before the page reloads, as JSON: its own, plus any extra ones (or None)."""
    return json.dumps({'diff': diff, 'unlocked': 4, 'mode': 'both', 'move': move, **(extra or {})})


ACTIVE_STATES = ('pop', 'walk', 'nibble', 'gloat')


def fleeing_nearby(n, st, w):
    """Running away, but still on or just off the screen."""
    return n['state'] == 'flee' and -70 < n['x'] < w / st['SC'] + 70


def active_nibblers(st, w):
    """The Nibblers that count as in play: popping up, walking, nibbling or gloating, or fleeing but still near the screen."""
    return [n for n in st['nibs'] if n['state'] in ACTIVE_STATES or fleeing_nearby(n, st, w)]


def has_thief(active):
    """Whether one of the Nibblers has stolen a piece: it gloats over it, then runs off with it."""
    return any(n['state'] in ('gloat', 'flee') for n in active)


def blast_delay(style, active):
    """Seconds a Nibbler may be about before the robot blows it away: at once when defending, soon for a thief, else late."""
    if style == 'defend': return 0.4
    return 0.5 if has_thief(active) else 4.5


def checked(log):
    """The log entries that report a check (a timeline point has its time in seconds first)."""
    return [x for x in log if not isinstance(x[0], float)]


def timeline(log):
    """The first 30 timeline points: the seconds in, the phase and the first letter of each piece's status."""
    return [x for x in log if isinstance(x[0], float)][:30]


async def open_scenario(browser, name, scenario, errors):
    """Opens the game with the scenario's settings, checks the start screen's look, then picks the hero and the level."""
    page = await browser.new_page(viewport={'width': scenario.w, 'height': scenario.h}, has_touch=True)
    localsite.watch(page, errors, PORT, name)
    await page.goto(f'{localsite.address(PORT)}index.html?speed={SPEED}&{scenario.season[0]}')
    saved = stored_settings(scenario.diff, scenario.move, scenario.settings)
    await page.evaluate(f"localStorage.setItem('bobs-outpost-settings', JSON.stringify({saved}))")
    await page.reload(); await page.wait_for_timeout(800)
    await check_season(page, name, scenario.season, errors)
    await page.click(f'.char[data-char="{scenario.hero}"]'); await page.wait_for_timeout(400)
    await page.click(f'.lvl[data-lvl="{scenario.level}"]')
    return page


@dataclass
class Robot:
    """The robot player of one scenario: its page, and what it remembers from one look at the game to the next."""
    page: Any
    name: str
    scenario: Scenario
    errors: list
    shots: set = field(default_factory=set, init=False)  # the screenshot tags already taken
    log: list = field(default_factory=list, init=False)  # timeline points and check results
    seen: Optional[float] = field(default=None, init=False)  # when the Nibblers now in play were first seen, or 0.6 s after the last blast; None when there are none
    last: Optional[list] = field(default=None, init=False)  # the pieces' status at the last look
    holding: bool = field(default=False, init=False)  # whether the right arrow key is down
    t0: float = field(init=False)  # when the robot started
    tested_pause: bool = field(init=False)  # only manual scenarios have the pause check

    def __post_init__(self): self.t0 = time.time(); self.tested_pause = self.scenario.move != 'manual'

    async def shot(self, tag):
        if tag not in self.shots:
            self.shots.add(tag); await self.page.screenshot(path=f'{OUT}/{self.name}_{tag}.png')

    def note_status(self, st):
        """Adds a timeline point whenever the pieces' status changes."""
        if st['status'] != self.last:
            self.log.append((round(time.time() - self.t0, 1), st['phase'], ''.join(x[0] for x in st['status']))); self.last = st['status']

    async def defend(self, st):
        """Deals with the Nibblers in play, and forgets them once there are none."""
        active = active_nibblers(st, self.scenario.w)
        if active: await self.meet_nibblers(active)
        else: self.seen = None

    async def meet_nibblers(self, active):
        """Takes a screenshot when Nibblers first show, and blows them away once they have been about long enough."""
        if self.seen is None:
            self.seen = time.time(); await self.shot('nibbler')
        if time.time() - self.seen > blast_delay(self.scenario.style, active): await self.blast()

    async def blast(self):
        await self.page.click('#actBtn', force=True); await self.page.wait_for_timeout(250)
        await self.shot('blast'); self.seen = time.time() + 0.6

    async def walk(self, st):
        """In manual mode holds the right arrow key while the hero walks; otherwise lets it go."""
        if st['phase'] == 'walk' and self.scenario.move == 'manual': await self.keep_walking(st)
        else: await self.release()

    async def keep_walking(self, st):
        # once the first piece is held: hold the gear button, and the game must pause
        if not self.tested_pause and st['status'][0] == 'held': await self.check_pause(st)
        await self.press()
        await self.shot('walk')

    async def check_pause(self, st):
        self.tested_pause = True
        await self.release()
        await check_pause_and_tap(self.page, st, self.shot, self.log, self.errors)

    async def press(self):
        if not self.holding: await self.page.keyboard.down('ArrowRight'); self.holding = True

    async def release(self):
        if self.holding: await self.page.keyboard.up('ArrowRight'); self.holding = False

    async def respond(self, st):
        """Answers the question, or taps the piece being carried into place."""
        if st['phase'] in ('ask', 'bask'): await self.ask(st)
        elif st['phase'] == 'place' and st['box']: await self.place(st)

    async def ask(self, st):
        await self.shot('ask_' + st['phase'] + '_' + (st['type'] or ''))
        await answer(self.page, st)
        await self.page.wait_for_timeout(350)

    async def place(self, st):
        await self.shot('place'); b = st['box']; await self.page.wait_for_timeout(300)
        await self.page.mouse.click(b['cx'] * st['SC'], b['cy'] * st['SC'])

    async def step(self):
        """One look at the game, and what the robot does about it. True once the outpost is finished."""
        st = await self.page.evaluate(STATE)
        if st['fin']:
            await self.page.wait_for_timeout(300); await self.shot('finish')
            return True
        self.note_status(st)
        await self.defend(st)
        await self.walk(st)
        await self.respond(st)
        await self.page.wait_for_timeout(120)
        return False

    async def run(self):
        """Plays until the outpost is finished or 400 seconds have passed."""
        finished = False
        while not finished and time.time() - self.t0 < 400:
            finished = await self.step()

    def report(self, st):
        """Prints how the scenario ended, then its check results and timeline."""
        print(f"{self.name}: finished={st['fin']} pieces={st['status']} | {st['finText']} | errors={self.errors[:3]} | {round(time.time() - self.t0)}s")
        print('   ', checked(self.log) or '', ' timeline:', timeline(self.log))


async def play(browser, name, scenario):
    """Plays one scenario; True if the outpost was finished and nothing went wrong."""
    errors = []
    page = await open_scenario(browser, name, scenario, errors)
    robot = Robot(page, name, scenario, errors)
    await robot.run()
    st = await page.evaluate(STATE)
    if not robot.tested_pause: errors.append('never got to the pause check')
    robot.report(st)
    await page.close()
    return st['fin'] and not errors


async def main(names):
    os.makedirs(OUT, exist_ok=True)
    srv = localsite.serve(PORT)
    async with async_playwright() as p:
        browser = await localsite.launch(p, '--autoplay-policy=no-user-gesture-required')
        results = await asyncio.gather(*[play(browser, n, Scenario(*SCENARIOS[n])) for n in names])
        await browser.close()
    srv.shutdown()
    return all(results)

if __name__ == '__main__':
    picked = sys.argv[1:] or list(SCENARIOS)
    ok = asyncio.run(main(picked))
    sys.exit(0 if ok else 1)
