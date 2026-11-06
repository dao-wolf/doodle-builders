"""Tests the question card and what the game says with it.

On every screen size, answers and gems must stay clear of the card, the other buttons and the caption, and stay
on screen, including after the screen turns mid-question. The built-in voices must say no letter sounds (neither
says them properly), but a player's own recordings of them must still play. The card must show "Find", with no
emojis, and on short screens the diamonds must stack (3 + 2), not run in one long row.

    python tools/playtest/card_test.py
"""
import asyncio, os, sys
from playwright.async_api import async_playwright
import localsite

OUT = os.path.join(os.path.dirname(__file__), 'out')
PORT = 8786
SIZES = [(320, 568), (390, 844), (568, 320), (844, 390), (768, 1024), (1024, 768),
         (800, 500), (1024, 600), (1280, 720), (1366, 650), (1440, 800), (1920, 950)]
ROUNDS = [('match', 't', None), ('match', 'igh', None), ('number', None, 10), ('count', None, 3), ('count', None, 5), ('count', None, 7)]
REPEATS = 5

ASK = '''([type, letter, want]) => {
  if (letter) chooseGrapheme = () => letter;
  for (let i = 0; i < 400; i++) {
    qi = PLANS.both.indexOf(type); items = []; askQuestion('journey');
    if (want == null || round.target === want || round.n === want) break;
  }
}'''
# Boxes allow for the floating movement and the pop as each answer appears. Returns the problems found.
CHECK = '''() => {
  const shown = e => e && e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && e.textContent !== '';
  const things = [['card', $('prompt')], ['pieces', $('bag')], ['top buttons', $('right')], ['caption', $('say')],
    ...[...document.querySelectorAll('button.big')].map(b => ['on-screen buttons', b])].filter(([, e]) => shown(e)).map(([n, e]) => [n, e.getBoundingClientRect()]);
  const hit = (a, b) => a.l < b.right && a.r > b.left && a.t < b.bottom && a.b > b.top;
  const box = (l, r, t, b) => ({ l: l * SC, r: r * SC, t: t * SC, b: b * SC });
  const bad = new Set();
  items.forEach(it => {
    const gem = it.kind === 'gem';
    const body = gem ? box(it.x - 30, it.x + 30, it.y - 30, it.y + 30) : box(it.x - 38, it.x + 47, it.y - 84, it.y + 5);
    const arrow = gem ? box(it.x - 18, it.x + 18, it.y - 68, it.y - 30) : box(it.x - 18, it.x + 18, it.y - 124, it.y - 86);
    things.forEach(([n, r]) => { if (hit(body, r)) bad.add((gem ? 'gem' : 'answer') + ' on ' + n); });
    if (hit(arrow, things[0][1])) bad.add('hint arrow on card');
    if (it.y + 5 > GY) bad.add('below the ground');
    if (it.x + (gem ? 23 : 47) > W) bad.add('off the right edge');
    items.forEach(o => { if (gem && o !== it && Math.hypot(o.x - it.x, o.y - it.y) < 46) bad.add('gem on gem'); });
  });
  const c = things[0][1], s = $('replay').getBoundingClientRect();
  if (c.left < 0 || c.right > innerWidth) bad.add('card off screen');
  if (s.top < 0 || s.right > innerWidth) bad.add('speaker button off screen');
  things.slice(1, 3).forEach(([n, r]) => { if (c.left < r.right && c.right > r.left && c.top < r.bottom && c.bottom > r.top) bad.add('card on ' + n); });
  if ($('pWord').textContent !== 'Find') bad.add('card does not say Find');
  if (/\\p{Extended_Pictographic}/u.test($('prompt').textContent)) bad.add('emoji on card');
  return [...bad];
}'''
ROWS = "[...$('pSlots').children].reduce((rows, s) => { rows[s.offsetTop] = (rows[s.offsetTop] || 0) + 1; return rows; }, {})"
SPY = '''() => {
  window.said = []; const realTalk = talk;
  talk = (parts, o) => { said.push(parts.filter(p => typeof p === 'string')); return realTalk(parts, o); };
}'''
WORDS = '''async ([type, letter, want]) => {
  said.length = 0; items = [];
  if (letter) chooseGrapheme = () => letter;
  for (let i = 0; i < 400; i++) { qi = PLANS.both.indexOf(type); askQuestion('journey'); if (want == null || round.target === want || round.n === want) break; }
  const asked = said[said.length - 1];
  if (type === 'count') return { asked };
  phase = 'ask'; said.length = 0;
  const wrong = items.find(i => i.val !== round.target), right = items.find(i => i.val === round.target);
  wrong.born = right.born = 0; chooseItem(wrong); const onWrong = said[0], captionOnWrong = $('say').textContent;
  said.length = 0; chooseItem(right);
  return { asked, onWrong, captionOnWrong, onRight: said[0].slice(1), captionOnRight: $('say').textContent };
}'''


async def open_game(browser, size, errors, name):
    page = await browser.new_page(viewport={'width': size[0], 'height': size[1]}, has_touch=True)
    localsite.watch(page, errors, PORT, name)
    await page.goto(f'{localsite.address(PORT)}index.html?season=none')
    await page.evaluate("localStorage.setItem('bobs-outpost-settings', JSON.stringify({ unlocked: 4, mode: 'both', move: 'manual', diff: 'easy', nums: 10 }))")
    await page.reload(); await page.wait_for_timeout(500)
    await page.click('.char[data-char="bob"]'); await page.wait_for_timeout(150)
    await page.click('.lvl[data-lvl="0"]'); await page.wait_for_timeout(500)
    await page.add_style_tag(content='#prompt { animation: none !important; }')
    return page


async def check_layout(browser, errors):
    rounds = 0
    for w, h in SIZES:
        page = await open_game(browser, (w, h), errors, f'{w}x{h}')
        for r in ROUNDS:
            for _ in range(REPEATS):
                await page.evaluate(ASK, list(r)); rounds += 1
                errors.extend(f'{w}x{h} {r}: {p}' for p in await page.evaluate(CHECK) if f'{w}x{h} {r}: {p}' not in errors)
        for case, letter in (('upper', 'ear'), ('both', 'ear'), ('both', 'igh')):  # the widest letters in each "Letters shown as" setting
            await page.evaluate(f"S.letterCase = '{case}'"); await page.evaluate(ASK, ['match', letter, None]); rounds += 1
            errors.extend(f'{w}x{h} {case} {letter}: {p}' for p in await page.evaluate(CHECK))
        await page.close()
    print(f'card: {rounds} rounds on {len(SIZES)} screen sizes')


async def check_turning(browser, errors):
    """Turning the screen mid-question must keep the answers on screen and clear of the card."""
    for r in ROUNDS[0], ROUNDS[4]:
        for a, b in (390, 844), (844, 390), (768, 1024):
            page = await open_game(browser, (a, b), errors, 'turning')
            await page.evaluate(ASK, list(r))
            await page.set_viewport_size({'width': b, 'height': a}); await page.wait_for_timeout(150)
            errors.extend(f'turned to {b}x{a} {r}: {p}' for p in await page.evaluate(CHECK))
            if await page.evaluate('items.some(i => i.y > GY)'): errors.append(f'turned to {b}x{a} {r}: answers below the ground')
            await page.close()


async def check_diamonds(browser, errors):
    page = await open_game(browser, (844, 390), errors, 'diamonds')
    for n, want in (2, [2]), (3, [3]), (4, [2, 2]), (5, [3, 2]), (6, [3, 3]), (7, [4, 3]):
        await page.evaluate(ASK, ['count', None, n] if n > 2 else ['count', None, 3])
        if n == 2: await page.evaluate("S.nums = 5"); await page.evaluate(ASK, ['count', None, 2]); await page.evaluate("S.nums = 10")
        rows = await page.evaluate(f'Object.keys({ROWS}).map(Number).sort((a, b) => a - b).map(k => ({ROWS})[k])')
        if rows != want: errors.append(f'{n} diamonds on a short screen are in rows {rows}, expected {want}')
    await page.close()


async def voice_page(browser, errors):
    page = await open_game(browser, (390, 844), errors, 'voice')
    await page.evaluate(SPY)
    return page


async def check_clips(browser, errors):
    """Jenny needs a clip for every line, and neither built-in voice has letter sounds."""
    page = await voice_page(browser, errors)
    clips = await page.evaluate("fetch('voice/jenny.json').then(r => r.json()).then(j => Object.keys(j))")
    if any(k.startswith('s_') for k in clips): errors.append('Jenny has letter sounds')
    missing = await page.evaluate("cl => Object.keys(TEXT).filter(k => !cl.includes(k))", clips)
    if missing: errors.append(f'lines with no Jenny clip (the whole line falls back to the device voice): {missing}')
    if await page.evaluate("Object.keys(TEXT).some(k => k.startsWith('s_'))"): errors.append('the device voice has words for letter sounds')
    await page.close()


async def check_letter_words(browser, errors):
    page = await voice_page(browser, errors)
    letter = await page.evaluate(WORDS, ['match', 't', None])
    want = {'asked': ['findit'], 'onWrong': ['tryagain'], 'captionOnWrong': '', 'onRight': ['w_t']}
    errors.extend(f'letter round {k}: {letter[k]}, expected {v}' for k, v in want.items() if letter[k] != v)
    if not letter['captionOnRight'].endswith(' Like tiger!'): errors.append(f"caption after a right answer: {letter['captionOnRight']}")
    await page.close()


async def check_number_words(browser, errors):
    page = await voice_page(browser, errors)
    number = await page.evaluate(WORDS, ['number', None, 4])
    if number['asked'] != ['findit', 'n4']: errors.append(f"number round asked {number['asked']}")
    if number['onWrong'][:1] != ['thats'] or number['onWrong'][2:] != ['findit', 'n4']: errors.append(f"number round on a wrong answer: {number['onWrong']}")
    gems = await page.evaluate(WORDS, ['count', None, 5])
    if gems['asked'] != ['findit', 'n5', 'gems']: errors.append(f"gem round asked {gems['asked']}")
    await page.close()


async def check_own_recording(browser, errors):
    """A player's own letter sound must play, and the voice studio must offer letter sounds and numbers."""
    page = await voice_page(browser, errors)
    await page.evaluate("MY.pack.s_t = new ArrayBuffer(8)")  # as if the player recorded this letter's sound
    mine = await page.evaluate(WORDS, ['match', 't', None])
    if mine['asked'].count('s_t') != 2 or mine['onRight'].count('s_t') != 2: errors.append(f'own recording of a letter sound did not play: {mine}')
    tabs = await page.evaluate("clipList().filter(c => c.key === 's_t' || c.key === 'n4').map(c => c.tab)")
    if tabs != ['sounds', 'numbers']: errors.append(f'voice studio cannot record letter sounds and numbers: {tabs}')
    await page.close()


async def check_device_voice(browser, errors):
    """With no recording, the device voice must skip the letter sound and say the rest of the line."""
    page = await voice_page(browser, errors)
    spoken = await page.evaluate('''async () => {
      const out = []; window.SpeechSynthesisUtterance = function (t) { out.push(t); };
      await talk(['findit', 's_t', 0.25, 's_t', 'w_t']); return out; }''')
    if spoken != ['Find like tiger!']: errors.append(f'the device voice said {spoken}')
    await page.close()


CHECKS = check_layout, check_turning, check_diamonds, check_clips, check_letter_words, check_number_words, check_own_recording, check_device_voice


async def main():
    os.makedirs(OUT, exist_ok=True)
    srv = localsite.serve(PORT); errors = []
    async with async_playwright() as p:
        browser = await localsite.launch(p)
        for check in CHECKS:
            await check(browser, errors)
        await browser.close()
    srv.shutdown()
    print('card: errors:', errors)
    return not errors

if __name__ == '__main__':
    sys.exit(0 if asyncio.run(main()) else 1)
