// The hero's house (the code calls it the den): a cosy meadow where a child feeds their hero by tracing. A letter or number
// shows as dots with a start dot; tracing it right sends a snack flying to the hero and fills a part of the snack bar, and three
// fill the bar and make the hero dance. A child can also tap the hero, and dress them up (a costume, and a colour for Lava).
// Nothing in it can go wrong: there is no score, nothing is taken away, nothing runs out and no hero is ever sad. Children
// can't read, so every control is a picture. The rules of tracing are in js/trace.js, which this file only shows.
'use strict';

// ------------------------------------------------------------------ the house
const DEN_HEIGHT = { bob: 112, henry: 124, dragon: 150, lava: 152 }; // how tall each hero is, to scale it to the screen
const DEN_MOUTH = { bob: [0, -76], henry: [56, -82], dragon: [64, -136], lava: [66, -98] }; // where a snack goes, in the hero's own units
const SNACKS = ['apple', 'strawberry', 'cupcake', 'corn'];
const COLOURS = { lava: ['sunny', 'lagoon'] }; // heroes that come in more than one colour
const OUTFIT_LABELS = { auto: 'Costume for the season', none: 'No costume', halloween: 'Halloween costume', christmas: 'Christmas costume', easter: 'Easter costume' };
const den = { on: false, tray: null, snacks: [], hearts: [], bits: [], look: null, h: 0, vy: 0, squash: 0, happyT: 0, snackIdx: 0,
  // tracing: what is being traced, how far, the snack bar, and what happens next
  phase: 'trace', item: null, shape: null, trace: null, finger: null, pointer: null, glow: 0, doneT: 0, popT: 0, bar: newBar(), asked: 0, recent: [],
  wait: 0, next: null, danceT: 0, voiceAt: -1e9 };
const TOUCH_PX = 28; // the least a finger may stray from the path, in screen pixels: a small finger is wider than the path's drawn line

const denScale = () => Math.min(2.4, (H * 0.34) / DEN_HEIGHT[S.char], (W * 0.4) / 130); // not taller than a third of the screen, nor wider than two fifths of it
const px = n => n / SC; // screen pixels to the game's units
// Where things go. Held sideways, the letter sits on the left and the hero on the right, with the snack bar above the hero; held upright,
// the snack bar is at the top, the letter fills the space above the hero, and the hero stands in the middle. The back button is at the
// top left, and the other buttons are in a column on the left (sideways) or a row at the bottom (upright), all clear of the letter.
function houseLayout() {
  const sideways = W > H, k = denScale(), tall = DEN_HEIGHT[S.char] * k, heroX = sideways ? W * 0.8 : W * 0.5;
  const [x0, x1, y0, y1] = sideways ? [px(116), heroX - 70 * k - px(12), px(12), H - px(12)] : [px(12), W - px(12), px(100), GY - tall - px(10)];
  const size = Math.max(40, Math.min(x1 - x0, y1 - y0) * 0.94);
  return { heroX, box: { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, size }, bar: sideways ? { cx: heroX, y: px(28) } : { cx: (W + px(84)) / 2, y: px(38) } };
}
const denX = () => houseLayout().heroX;
// Where a point of the shape lies on the screen, and where a screen point lies in the shape
const shapeSpot = ([u, v]) => { const { box } = houseLayout(); return [box.cx + (u - den.shape.w / 2) * box.size, box.cy + (v - den.shape.h / 2) * box.size]; };
const spotShape = ([x, y]) => { const { box } = houseLayout(); return [(x - box.cx) / box.size + den.shape.w / 2, (y - box.cy) / box.size + den.shape.h / 2]; };
const traceTolerance = () => Math.max(TRACE_RULES.tolerance, TOUCH_PX / (houseLayout().box.size * SC));
function denLook() { // the meadow behind the den, in the season's colours
  if (!den.look || den.look.season !== SEASON) { const th = landTheme('meadow'); den.look = { season: SEASON, th, gt: themeTextures(th) }; den.bits = fallingBits(th); }
  TH = den.look.th; GT = den.look.gt;
}

function openDen() {
  audioInit(); resize();
  if (den.bar.full) den.bar = danced(den.bar); // left before the dance: start a new bar
  den.on = true; den.snacks = []; den.hearts = []; den.h = 0; den.vy = 0; den.happyT = 0.8; den.next = null; den.pointer = null; den.finger = null;
  hero.face = 1; camX = 0; // the hero faces right, like on the start screen cards
  $('levels').hidden = true; $('den').hidden = false;
  setTray(null); fillTray(); syncDenButtons();
  clearTimeout(sayTimer); $('say').textContent = ''; // a caption from choosing the hero would sit on top of the letter
  talk(['hi_' + S.char], { show: false });
  newRound({ interrupt: false });
}
function closeDen() { den.on = false; den.pointer = null; stopVoice(); $('den').hidden = true; showLevels(); }

// ------------------------------------------------------------------ tracing
const itemVoice = item => item.kind === 'letter' ? [...soundOf(item.id), 'w_' + item.id] : ['n' + item.n]; // a letter's sound if recorded, and its word; a number's name
function newRound({ interrupt = true } = {}) { // the next letter or number to trace
  const picked = pickTraceItem({ weeks: S.weeks, mode: S.mode, nums: S.nums }, den.recent, den.asked++);
  den.item = picked.item; den.recent = picked.recent;
  den.shape = traceShape(picked.item); den.trace = newTrace(den.shape, { tolerance: traceTolerance() });
  den.phase = 'trace'; den.finger = null; den.glow = 0; den.doneT = 0; den.pointer = null;
  talk(itemVoice(picked.item), { interrupt, show: false });
}
function sayItem() { // lets a child hear what they are tracing, not more often than every few seconds
  const t = performance.now();
  if (t - den.voiceAt < 2500) return;
  den.voiceAt = t; talk(itemVoice(den.item), { show: false });
}
function applyTrace(trace, at) { // takes a new trace from js/trace.js and reacts to what the last touch did
  den.trace = trace; den.finger = at;
  if (trace.event === 'off') { den.glow = 1; sayItem(); } // nothing is lost: the dots glow, and the voice says what to trace
  else if (trace.event === 'stroke') { SFX.pick(); den.popT = 0.4; }
  else if (trace.event === 'done') rightTrace();
}
function rightTrace() { // the whole shape is traced: a snack flies to the hero, and a part of the snack bar fills
  den.phase = 'reward'; den.doneT = 0; den.finger = null; den.pointer = null; den.bar = addSnack(den.bar);
  const [x, y] = shapeSpot(den.shape.strokes[den.shape.strokes.length - 1].pts.slice(-1)[0]);
  den.snacks.push({ kind: SNACKS[den.snackIdx++ % SNACKS.length], t: 0, bites: 0, from: [x, y] });
  SFX.good(); den.popT = 0.5;
  talk([yes(), ...itemVoice(den.item)], { show: false });
  heartsAt(x, y, 6, 'star');
  den.next = den.bar.full ? 'dance' : 'round'; den.wait = den.bar.full ? SNACK_FALL + 3 * SNACK_BITE + 0.3 : SNACK_FALL + 0.2;
}
function startDance() { // the bar is full: a happy dance, then a new bar
  den.phase = 'dance'; den.danceT = 2.6; den.happyT = 2.6; SFX.party();
  heartsAt(denX(), GY - DEN_HEIGHT[S.char] * denScale() * 0.9, 14, 'star');
}
function skipItem() { audioInit(); if (den.phase === 'trace') newRound(); } // a different letter or number, if this one is hard today

// ------------------------------------------------------------------ what the hero does
function denHop(v = -460) { if (den.h <= 0) { den.vy = v; den.h = 0.01; } }
function pet() { den.happyT = 1.3; denHop(); SFX.giggle(); heartsAt(denX(), GY - DEN_HEIGHT[S.char] * denScale() * 0.8, 5); }
function heartsAt(x, y, n, kind = 'heart') {
  for (let i = 0; i < n; i++) den.hearts.push({ kind, x: x + rand(-40, 40), y: y + rand(-20, 20), vx: rand(-30, 30), vy: rand(-110, -60), age: 0, life: rand(1.1, 1.7), c: pick(kind === 'star' ? PASTEL : ['#ff5a8a', '#ff7aa8', '#ff9ec4']) });
}

// ------------------------------------------------------------------ time passes
function updateDen(dt) {
  den.happyT = Math.max(0, den.happyT - dt); den.squash *= Math.pow(0.0005, dt);
  den.glow = Math.max(0, den.glow - dt / 1.1); den.popT = Math.max(0, den.popT - dt);
  if (den.phase === 'reward') den.doneT += dt;
  if (den.h > 0) {
    den.vy += 1500 * dt; den.h -= den.vy * dt;
    if (den.h <= 0) { den.h = 0; den.vy = 0; den.squash = 0.18; SFX.land(); }
  }
  den.bits.forEach(f => { f.y += f.v * dt / H; f.x += Math.sin(now + f.s * 3) * 0.01 * dt; if (f.y > 1) { f.y = 0; f.x = Math.random(); } }); // snow or petals
  den.hearts.forEach(p => { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; });
  den.hearts = den.hearts.filter(p => p.age < p.life);
  den.snacks.forEach(sn => updateSnack(sn, dt)); den.snacks = den.snacks.filter(sn => !sn.eaten);
  if (den.next && (den.wait -= dt) <= 0) { const what = den.next; den.next = null; if (what === 'dance') startDance(); else newRound({ interrupt: false }); }
  if (den.phase === 'dance') {
    den.danceT -= dt;
    if (den.h <= 0 && den.danceT > 0.3) { denHop(-430); SFX.giggle(); }
    if (den.danceT <= 0) { den.bar = danced(den.bar); newRound({ interrupt: false }); }
  }
}
const SNACK_FALL = 0.8, SNACK_BITE = 0.45;
function updateSnack(s, dt) { // a snack flies to the hero's mouth, then they munch it in three bites and hop happily
  const was = Math.floor((s.t - SNACK_FALL) / SNACK_BITE);
  s.t += dt;
  if (s.t < SNACK_FALL) return;
  const bites = Math.floor((s.t - SNACK_FALL) / SNACK_BITE);
  if (bites !== was && bites <= 3) { s.bites = bites; SFX.munch(); }
  if (bites >= 3) { s.eaten = true; if (den.phase !== 'dance') { den.happyT = Math.max(den.happyT, 1.4); denHop(-380); SFX.giggle(); heartsAt(denX(), GY - DEN_HEIGHT[S.char] * denScale() * 0.9, 8); } }
}

// ------------------------------------------------------------------ drawing
function denPose(time) { // the hero's pose: breathing in place, happy, hopping, chewing, or watching the finger
  const L = LOOKS[S.char], o = { face: { eyes: (time * 1000) % 3100 < 120 ? 'closed' : 'open', mouth: 'smile' } };
  L.walk(o, 0);
  if (den.finger) L.look(o, clamp((den.finger[0] - denX()) / 30, -5, 5), clamp((den.finger[1] - (GY - 100)) / 40, -4, 4));
  if (den.h > 0) { o.face.mouth = 'O'; L.air(o); }
  if (den.happyT > 0) { o.face.mouth = 'grin'; L.happy(o, time); }
  const eating = den.snacks.find(sn => sn.t >= SNACK_FALL), coming = den.snacks.find(sn => sn.t < SNACK_FALL);
  if (eating) o.face.mouth = Math.sin(time * 28) > 0 ? 'open' : 'smile'; else if (coming) o.face.mouth = 'O';
  return o;
}
function drawDen(time) {
  denLook(); camX = 0;
  const { heroX } = houseLayout(), k = denScale();
  drawSky(time); drawGround();
  [[0.1, 'small', 0.8], [W > H ? 0.55 : 0.88, 'small', 1], [0.95, 'tree', 1]].forEach(([fx, kind, s], i) => { // a little scenery, standing on the grass, clear of the hero
    if (Math.abs(fx * W - heroX) < 80 * k) return;
    const name = kind === 'tree' ? TH.trees[0] : TH.small[i % TH.small.length];
    drawDeco({ x: fx * W, kind: name, s, seed: 0.3 + i * 0.2 }, time);
  });
  if (den.shape && den.phase !== 'dance') drawTracing(time);
  drawDenHero(time);
  den.snacks.forEach(drawFlyingSnack);
  den.hearts.forEach(drawSparkle);
  den.bits.forEach(f => { ctx.fillStyle = f.c; ctx.fillRect(f.x * W, f.y * GY, f.s, f.s); });
  drawSnackBar(time);
}
function drawDenHero(time) {
  const L = LOOKS[S.char], k = denScale(), x = denX();
  drawShadow(x + L.shadow[0] * k, den.h, L.shadow[1] * k);
  OUTFIT = outfitOf(S.char);
  ctx.save(); ctx.translate(x, GY - den.h); ctx.scale(k, k);
  L.draw({ x: 0, y: 0, squash: den.squash }, time, denPose(time));
  ctx.restore();
}
// The letter or number as a pale band with a dotted line down its middle and a green start dot; what has been traced fills in orange.
// A finger off the path makes the band glow, so the child sees where to go. After a right trace the whole shape fills in.
function pathPoints(pts) { return pts.map(shapeSpot); }
function strokePath(pts) { ctx.beginPath(); pathPoints(pts).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); }
function drawTracing(time) {
  const { box } = houseLayout(), w = box.size * 0.15, glow = den.glow, done = den.phase === 'reward', pop = 1 + 0.06 * Math.sin(clamp(den.popT / 0.5, 0, 1) * Math.PI);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.translate(box.cx, box.cy); ctx.scale(pop, pop); ctx.translate(-box.cx, -box.cy);
  if (glow > 0) { ctx.shadowColor = '#ffd23f'; ctx.shadowBlur = box.size * 0.12 * glow; }
  ctx.strokeStyle = glow > 0 ? `rgba(255,${240 - 20 * glow | 0},${200 - 140 * glow | 0},.9)` : 'rgba(255,255,255,.72)'; ctx.lineWidth = w;
  den.shape.strokes.forEach(s => { strokePath(s.pts); ctx.stroke(); });
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  den.shape.dots.forEach(d => { const [x, y] = shapeSpot(d); roundBlob(x, y, w * 0.55, w * 0.55, '#ffffff'); });
  ctx.strokeStyle = 'rgba(43,33,64,.5)'; ctx.lineWidth = Math.max(3, box.size * 0.02); ctx.setLineDash([box.size * 0.001, box.size * 0.055]);
  den.shape.strokes.forEach(s => { strokePath(s.pts); ctx.stroke(); });
  ctx.setLineDash([]);
  ctx.strokeStyle = done ? '#ff9a3d' : '#ff7a2b'; ctx.lineWidth = w * 0.72;
  traceDrawn(den.trace).forEach(pts => { strokePath(pts); ctx.stroke(); });
  ctx.restore();
  const start = traceStart(den.trace);
  if (start && den.phase === 'trace') drawStartDot(shapeSpot(start), box.size, time);
  if (den.finger && den.phase === 'trace') { ctx.fillStyle = 'rgba(43,33,64,.22)'; ctx.beginPath(); ctx.arc(den.finger[0], den.finger[1], box.size * 0.05, 0, 7); ctx.fill(); }
}
function drawStartDot([x, y], size, time) { // pulses a little, to say "start here"
  const r = size * 0.052 * (1 + 0.14 * Math.sin(time * 6));
  ctx.fillStyle = 'rgba(43,33,64,.85)'; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, 7); ctx.fill();
  ctx.fillStyle = '#3cb371'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
}
// Three chunky parts. They fill with the snacks and stay full until the hero has danced.
function drawSnackBar(time) {
  const { bar } = houseLayout(), pw = px(56), ph = px(22), gap = px(10), b = px(4);
  for (let i = 0; i < SNACKS_PER_BAR; i++) {
    const x = bar.cx + (i - 1) * (pw + gap) - pw / 2, y = bar.y - ph / 2, on = i < den.bar.filled;
    pixel(x - b, y - b, pw + 2 * b, ph + 2 * b, '#2b2140'); pixel(x, y, pw, ph, on ? '#ffa94d' : '#ffffff');
    if (on) { pixel(x, y, pw, ph * 0.35, '#ffc77a'); if (i === den.bar.filled - 1 && den.popT > 0) pixel(x, y, pw, ph, 'rgba(255,255,255,.55)'); }
  }
}
function drawFlyingSnack(s) { // flies from where the child finished tracing to the hero's mouth, in an arc
  const k = denScale(), [mx, my] = DEN_MOUTH[S.char], tx = denX() + mx * k, ty = GY - den.h + my * k, fly = easeInOut(s.t / SNACK_FALL);
  const x = lerp(s.from[0], tx, fly), y = lerp(s.from[1], ty - 4 * k, fly) - Math.sin(fly * Math.PI) * 70 * k;
  drawSnack(s.kind, x, y, k * 0.9 * (1 - 0.22 * s.bites)); // a bite smaller each time
}
function drawSparkle(p) {
  const a = 1 - p.age / p.life;
  ctx.globalAlpha = clamp(a * 2, 0, 1);
  if (p.kind === 'star') pixel(p.x - 3, p.y - 3, 6, 6, p.c); else pixelHeart(p.x, p.y, 3, p.c);
  ctx.globalAlpha = 1;
}
const HEART_ROWS = ['01100110', '11111111', '11111111', '01111110', '00111100', '00011000'];
function pixelHeart(x, y, s, c) { ctx.fillStyle = c; HEART_ROWS.forEach((row, j) => [...row].forEach((v, i) => { if (v === '1') ctx.fillRect(x + (i - 4) * s, y + (j - 3) * s, s, s); })); }
const SNACK_ART = { // each snack is drawn about 24 units across, centred on its middle
  apple: () => { roundBlob(0, 2, 11, 11, '#e8322b'); roundBlob(-3, -1, 4, 5, '#ff8a7a'); pixel(-1, -13, 3, 6, '#7a4a22'); pixel(2, -12, 7, 4, '#4fb86a'); },
  strawberry: () => { roundBlob(0, 0, 10, 12, '#ff4f6a'); pixel(-9, -13, 18, 4, '#4fb86a'); pixel(-2, -16, 4, 4, '#4fb86a'); [[-4, -4], [3, -2], [-2, 3], [4, 6], [-5, 6]].forEach(([x, y]) => pixel(x, y, 2, 2, '#ffe27a')); },
  cupcake: () => { pixel(-9, 1, 18, 10, '#c4894a'); pixel(-9, 5, 18, 2, '#a06a30'); roundBlob(0, -4, 11, 8, '#ff9ec4'); roundBlob(0, -11, 6, 5, '#ffd0e0'); pixel(-1, -17, 3, 3, '#e8322b'); },
  corn: () => { roundBlob(0, 0, 7, 13, '#ffd23f'); [-6, -2, 2].forEach(y => pixel(-5, y, 10, 1, '#e0a91a')); pixel(-9, 2, 6, 13, '#4fb86a'); pixel(3, 2, 6, 13, '#4fb86a'); },
};
function drawSnack(kind, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); SNACK_ART[kind](); ctx.restore(); }
// ------------------------------------------------------------------ the buttons
const PICTURES = { // the costume buttons that aren't a season's picture: the season's own, and no costume
  auto: '<svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><g fill="#ffb81c"><rect x="7" y="0" width="2" height="16"/><rect x="0" y="7" width="16" height="2"/><rect x="5" y="5" width="6" height="6"/></g><g fill="#fff6cf"><rect x="7" y="7" width="2" height="2"/></g><g fill="#ffd23f"><rect x="3" y="3" width="2" height="2"/><rect x="11" y="3" width="2" height="2"/><rect x="3" y="11" width="2" height="2"/><rect x="11" y="11" width="2" height="2"/></g></svg>',
  none: '<svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><g fill="#2b2140"><rect x="5" y="1" width="6" height="2"/><rect x="3" y="3" width="2" height="2"/><rect x="11" y="3" width="2" height="2"/><rect x="2" y="5" width="2" height="6"/><rect x="12" y="5" width="2" height="6"/><rect x="3" y="11" width="2" height="2"/><rect x="11" y="11" width="2" height="2"/><rect x="5" y="13" width="6" height="2"/></g><g fill="#e2456a"><rect x="3" y="12" width="2" height="2"/><rect x="5" y="10" width="2" height="2"/><rect x="7" y="7" width="2" height="2"/><rect x="9" y="5" width="2" height="2"/><rect x="11" y="3" width="2" height="2"/></g></svg>' };
const colourSwatch = id => `<span class="swatch ${id}"></span>`;
function chip(kind, value, picture, label) { return `<button class="chip" type="button" data-kind="${kind}" data-value="${value}" aria-label="${label}" aria-pressed="false">${picture}</button>`; }
// The picture buttons for dressing up: a costume each (none while a grown-up has seasonal themes Off), then Lava's colours.
// A hero with nothing to choose has no Dress button.
function fillTray() {
  const pic = season => $('seasonBtn').querySelector(`.pic.${season}`).outerHTML;
  const outfits = S.seasons === 'off' ? [] : OUTFITS;
  let html = outfits.map(id => chip('outfit', id, PICTURES[id] || pic(id), OUTFIT_LABELS[id])).join('');
  html += (COLOURS[S.char] || []).map(c => chip('colour', c, colourSwatch(c), c === 'sunny' ? 'Sunny colours' : 'Lagoon colours')).join('');
  $('denTray').innerHTML = html; $('denDress').hidden = !html;
}
function setTray(mode) { den.tray = mode; $('denTray').hidden = mode !== 'dress'; syncDenButtons(); }
function syncDenButtons() {
  $('denDress').setAttribute('aria-pressed', den.tray === 'dress' ? 'true' : 'false');
  const outfit = (S.outfits || {})[S.char] || 'auto';
  $('denTray').querySelectorAll('.chip').forEach(c => {
    const on = c.dataset.kind === 'outfit' ? c.dataset.value === outfit : c.dataset.value === S.lavaColour;
    c.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}
function choose(kind, value) {
  if (kind === 'outfit') S.outfits = Object.assign({}, S.outfits, { [S.char]: value }); else S.lavaColour = value;
  saveSettings(); syncDenButtons();
  den.happyT = 1; denHop(-340); SFX.good(); heartsAt(denX(), GY - DEN_HEIGHT[S.char] * denScale() * 0.7, 8, 'star');
}
// The button on the outposts screen is a picture of a house, and says whose house for a screen reader ("Lava's house").
const houseName = who => `${HEROES[who].name}'s house`;
function syncHouseButton() { $('denBtn').setAttribute('aria-label', `Visit ${houseName(S.char)}`); }
new MutationObserver(syncHouseButton).observe($('levels'), { attributes: true, attributeFilter: ['hidden'] }); // the outposts screen opens after a hero is chosen
syncHouseButton();
$('denBtn').addEventListener('click', openDen);
$('denBack').addEventListener('click', closeDen);
$('denNext').addEventListener('click', skipItem);
$('denDress').addEventListener('click', () => { audioInit(); setTray(den.tray === 'dress' ? null : 'dress'); });
$('denTray').addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) { audioInit(); choose(c.dataset.kind, c.dataset.value); } });
const tapsHero = (x, y) => { const k = denScale(); return Math.abs(x - denX()) < 70 * k && y > GY - DEN_HEIGHT[S.char] * k - den.h - 10 && y < GY + 20; };
cv.addEventListener('pointerdown', ev => { // tap the hero to pet them; anywhere else starts a trace
  if (!den.on) return;
  audioInit();
  const at = worldPoint(ev);
  if (tapsHero(...at)) { pet(); return; }
  if (den.phase !== 'trace' || den.pointer !== null) return;
  den.pointer = ev.pointerId;
  try { cv.setPointerCapture(ev.pointerId); } catch (e) { /* the pointer has gone already */ }
  applyTrace(traceDown({ ...den.trace, tol: traceTolerance() }, spotShape(at)), at);
});
cv.addEventListener('pointermove', ev => {
  if (!den.on || ev.pointerId !== den.pointer || den.phase !== 'trace') return;
  const at = worldPoint(ev);
  applyTrace(traceMove(den.trace, spotShape(at)), at);
});
const liftFinger = ev => { // a lift keeps what was traced, and the next touch can carry on or start again
  if (!den.on || ev.pointerId !== den.pointer) return;
  den.pointer = null; den.finger = null;
  if (den.phase === 'trace') den.trace = traceUp(den.trace);
};
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => cv.addEventListener(name, liftFinger));
