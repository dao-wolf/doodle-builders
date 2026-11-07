"""Tests the question card and what the game says with it.

On every screen size, answers and gems must stay clear of the card, the other buttons, the caption and each other,
and stay on screen, including after the screen turns mid-question. The card is 80% of its first size and the
answers 110% of theirs, and where a tap counts on an answer grows with it. Every letter must fit inside the card,
tails (g, j, p, q, y) included, without touching "Find". The built-in voices must say no letter
sounds (neither says them properly), but a player's own recordings of them must still play. The card must show
"Find", with no emojis, and on short screens the diamonds must stack (3 + 2), not run in one long row.

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
  const bad = new Set(), K = ANSWER_K; // answers are drawn K times their first size
  const bodyOf = it => it.kind === 'gem' ? box(it.x - 24 * K - 6, it.x + 24 * K + 6, it.y - 24 * K - 6, it.y + 24 * K + 6)
    : box(it.x - 38 * K, it.x + 47 * K, it.y - 84 * K, it.y + 5);
  items.forEach(it => {
    const gem = it.kind === 'gem', body = bodyOf(it), tip = it.y - (gem ? 30 : 86) * K;
    things.forEach(([n, r]) => { if (hit(body, r)) bad.add((gem ? 'gem' : 'answer') + ' on ' + n); });
    if (hit(box(it.x - 18, it.x + 18, tip - 38, tip), things[0][1])) bad.add('hint arrow on card');
    if (it.y + 5 > GY) bad.add('below the ground');
    if (it.x + (gem ? 23 : 47) * K > W) bad.add('off the right edge');
    items.forEach(o => {
      if (o === it) return;
      if (gem && Math.hypot(o.x - it.x, o.y - it.y) < 46 * K) bad.add('gem on gem');
      const ob = bodyOf(o), mine = box(it.x - 33 * K, it.x + 42 * K, it.y - 80 * K, it.y); // the block itself, without the float
      if (!gem && hit(mine, { left: ob.l, right: ob.r, top: ob.t, bottom: ob.b })) bad.add('answer on answer');
    });
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


CARD_K, ANSWER_K = 0.8, 1.1  # the owner's sizes: the card 20% smaller, the answers 10% bigger, than first designed
# The card's width and height over its first size (--card-k back at 1), for a number, a letter and five diamonds.
# The speaker button keeps its size, so where it sits inside the card (short screens) it is left out of the width.
CARD_SIZES = '''() => {
  const p = $('prompt'), r = $('replay'), out = [];
  const size = () => { const b = p.getBoundingClientRect(), inside = getComputedStyle(r).position === 'static';
    return [b.width - (inside ? r.getBoundingClientRect().width : 0), b.height]; };
  for (const [html, gems] of [['4', 0], [gHTML('igh'), 0], ['5', 5]]) {
    setPrompt(html, gems); p.classList.remove('pop');
    const shown = size(); p.style.setProperty('--card-k', '1'); const first = size(); p.style.removeProperty('--card-k');
    out.push([shown[0] / first[0], shown[1] / first[1]]);
  }
  return out;
}'''
# Draws an answer block and a gem the way the game does, and at their first size (scale 1), four times larger so the
# smoothed edges barely count, and returns the game's width and height over the first size's.
ANSWER_SIZES = '''() => {
  const measure = draw => {
    const c = document.createElement('canvas'); c.width = c.height = 800; const g = c.getContext('2d'), saved = ctx, gy = GY;
    ctx = g; g.scale(4, 4); GY = 9999; draw(); GY = gy; ctx = saved; // GY far below: no shadow on the measure
    const d = g.getImageData(0, 0, 800, 800).data; let x0 = 800, x1 = -1, y0 = 800, y1 = -1;
    for (let y = 0; y < 800; y++) for (let x = 0; x < 800; x++) if (d[(y * 800 + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return [x1 - x0 + 1, y1 - y0 + 1];
  };
  const it = { x: 100, y: 150, born: now - 10, ph: 0, wob: 0, state: 'idle', cool: 0 };
  const block = { ...it, kind: 'number', val: 4, col: BLOCK_COLS[0] }, gem = { ...it, kind: 'gem', hue: '#3fd0e8' };
  const ratio = (a, b) => [a[0] / b[0], a[1] / b[1]];
  return { block: ratio(measure(() => drawItem(block, 0)), measure(() => drawCube(100, 150, block.col, block, 1))),
    gem: ratio(measure(() => drawItem(gem, 0)), measure(() => drawGem(100, 150, gem.hue, 1))) };
}'''
# A tap just beyond where an answer used to end now counts, and one beyond its new edge doesn't
TAPS = '''() => {
  const b = { x: 100, y: 150, kind: 'number' }, g = { x: 100, y: 150, kind: 'gem' };
  return { block: [itemHit(b, 100 + 44 * 1.05, 110), itemHit(b, 100 + 44 * 1.15, 110)], gem: [itemHit(g, 100 + 40 * 1.05, 150), itemHit(g, 100 + 40 * 1.15, 150)] };
}'''


# Where each letter's ink (what is drawn, not its box) sits: its lowest point's distance from the inside of the card's
# bottom edge, and whether it overlaps "Find" (above it on most screens, beside it on short ones). Every letter, in
# every "Letters shown as" setting.
INK = '''async () => {
  await document.fonts.load('700 100px Andika'); await document.fonts.ready;
  const g = document.createElement('canvas').getContext('2d'), p = $('prompt'), big = $('pBig'), out = [], was = S.letterCase;
  for (const lc of ['lower', 'upper', 'both']) {
    S.letterCase = lc;
    for (const id of Object.keys(G)) {
      setPrompt(gHTML(id)); p.classList.remove('pop');
      const probe = document.createElement('span'); probe.style.cssText = 'display:inline-block;width:0;height:0'; big.appendChild(probe);
      const base = probe.getBoundingClientRect().bottom; probe.remove(); // the line the letters sit on
      let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity;
      big.childNodes.forEach(n => {
        const f = getComputedStyle(n.nodeType === 1 ? n : big); g.font = `${f.fontWeight} ${f.fontSize} ${f.fontFamily}`;
        const m = g.measureText(n.textContent), range = document.createRange(); range.selectNodeContents(n);
        const x = range.getBoundingClientRect().left; // where the text starts
        top = Math.min(top, base - m.actualBoundingBoxAscent); bottom = Math.max(bottom, base + m.actualBoundingBoxDescent);
        left = Math.min(left, x - m.actualBoundingBoxLeft); right = Math.max(right, x + m.actualBoundingBoxRight);
      });
      const r = p.getBoundingClientRect(), edge = r.bottom - parseFloat(getComputedStyle(p).borderBottomWidth), w = $('pWord').getBoundingClientRect();
      const onFind = left < w.right && right > w.left && top < w.bottom && bottom > w.top;
      out.push([big.textContent, edge - bottom, onFind]);
    }
  }
  S.letterCase = was;
  return out;
}'''


async def check_letters_fit(browser, errors):
    """Letters with a tail (g, j, p, q, y) must not reach the card's edge, and no letter may touch "Find"."""
    for w, h in (320, 568), (390, 844), (844, 390), (1024, 768), (1440, 800):
        page = await open_game(browser, (w, h), errors, f'letters fit {w}x{h}')
        rows = await page.evaluate(INK)
        low = sorted({shown for shown, below, _ in rows if below < 4})
        high = sorted({shown for shown, _, on_find in rows if on_find})
        if low: errors.append(f'{w}x{h}: {len(low)} letters reach within 4px of the card\'s bottom edge: {low[:10]}')
        if high: errors.append(f'{w}x{h}: {len(high)} letters touch "Find": {high[:10]}')
        await page.close()


async def check_sizes(browser, errors):
    near = lambda v, want: abs(v - want) <= 0.02
    for w, h in (320, 568), (390, 844), (844, 390), (1024, 768), (1440, 800):
        page = await open_game(browser, (w, h), errors, f'sizes {w}x{h}')
        for what, (rw, rh) in zip(('number', 'letter', 'diamonds'), await page.evaluate(CARD_SIZES)):
            if not (near(rw, CARD_K) and near(rh, CARD_K)): errors.append(f'{w}x{h} card with a {what}: {rw:.3f} x {rh:.3f} of its first size, expected {CARD_K}')
        await page.close()
    page = await open_game(browser, (390, 844), errors, 'answer sizes')
    for what, (rw, rh) in (await page.evaluate(ANSWER_SIZES)).items():
        if not (near(rw, ANSWER_K) and near(rh, ANSWER_K)): errors.append(f'{what}: {rw:.3f} x {rh:.3f} of its first size, expected {ANSWER_K}')
    for what, counts in (await page.evaluate(TAPS)).items():
        if counts != [True, False]: errors.append(f'taps around a {what} (just beyond its first size, beyond its new size): {counts}, expected [True, False]')
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


CHECKS = check_layout, check_turning, check_diamonds, check_sizes, check_letters_fit, check_clips, check_letter_words, check_number_words, check_own_recording, check_device_voice


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
