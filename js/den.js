// The den: a cosy meadow where a child looks after their hero. They can tap the hero, feed them, play ball with them and dress
// them up (a costume, and a colour for Lava). Nothing in it can go wrong: there is no score, nothing to forget and no sad hero.
// Children can't read, so every control is a picture; the hero's hello is the line they already know.
'use strict';

// ------------------------------------------------------------------ the den
const DEN_HEIGHT = { bob: 112, henry: 124, dragon: 150, lava: 152 }; // how tall each hero is, to scale it to the screen
const DEN_MOUTH = { bob: [0, -76], henry: [56, -82], dragon: [64, -136], lava: [66, -98] }; // where a snack goes, in the hero's own units
const SNACKS = ['apple', 'strawberry', 'cupcake', 'corn'];
const COLOURS = { lava: ['sunny', 'lagoon'] }; // heroes that come in more than one colour
const OUTFIT_LABELS = { auto: 'Costume for the season', none: 'No costume', halloween: 'Halloween costume', christmas: 'Christmas costume', easter: 'Easter costume' };
const den = { on: false, tray: null, snack: null, ball: null, hearts: [], bits: [], look: null, h: 0, vy: 0, squash: 0, happyT: 0, snackIdx: 0, kickT: 0, headT: 0 };

const denScale = () => Math.min(2.4, (H * 0.34) / DEN_HEIGHT[S.char], (W * 0.4) / 130); // not taller than a third of the screen, nor wider than two fifths of it
const ballRadius = () => 14 * denScale();
const denX = () => W * 0.4;
function denLook() { // the meadow behind the den, in the season's colours
  if (!den.look || den.look.season !== SEASON) { const th = landTheme('meadow'); den.look = { season: SEASON, th, gt: themeTextures(th) }; den.bits = fallingBits(th); }
  TH = den.look.th; GT = den.look.gt;
}

function openDen() {
  audioInit(); resize();
  den.on = true; den.snack = null; den.ball = null; den.hearts = []; den.h = 0; den.vy = 0; den.happyT = 0.8;
  hero.face = 1; camX = 0; // the hero faces right, like on the start screen cards
  $('levels').hidden = true; $('den').hidden = false;
  setTray(null); fillTray(); syncDenButtons();
  talk(['hi_' + S.char]);
}
function closeDen() { den.on = false; stopVoice(); $('den').hidden = true; showLevels(); }

// ------------------------------------------------------------------ what the hero does
function denHop(v = -460) { if (den.h <= 0) { den.vy = v; den.h = 0.01; } }
function pet() { den.happyT = 1.3; denHop(); SFX.giggle(); heartsAt(denX(), GY - DEN_HEIGHT[S.char] * denScale() * 0.8, 5); }
function heartsAt(x, y, n, kind = 'heart') {
  for (let i = 0; i < n; i++) den.hearts.push({ kind, x: x + rand(-40, 40), y: y + rand(-20, 20), vx: rand(-30, 30), vy: rand(-110, -60), age: 0, life: rand(1.1, 1.7), c: pick(kind === 'star' ? PASTEL : ['#ff5a8a', '#ff7aa8', '#ff9ec4']) });
}
function feed() {
  if (den.snack) return;
  den.snack = { kind: SNACKS[den.snackIdx++ % SNACKS.length], t: 0, bites: 0 };
  SFX.pop();
}
function togglePlay() {
  if (den.ball) { den.ball = null; SFX.pop(); return; }
  den.ball = { x: denX() + 90 * denScale(), y: -40, vx: -60, vy: 0, rot: 0, rest: 0 };
  SFX.pop();
}
function kickBall(vx) { den.ball.vy = -760; den.ball.vx = vx; den.ball.rest = 0; SFX.bounce(); }

// ------------------------------------------------------------------ time passes
function updateDen(dt) {
  den.happyT = Math.max(0, den.happyT - dt); den.squash *= Math.pow(0.0005, dt);
  if (den.h > 0) {
    den.vy += 1500 * dt; den.h -= den.vy * dt;
    if (den.h <= 0) { den.h = 0; den.vy = 0; den.squash = 0.18; SFX.land(); }
  }
  den.bits.forEach(f => { f.y += f.v * dt / H; f.x += Math.sin(now + f.s * 3) * 0.01 * dt; if (f.y > 1) { f.y = 0; f.x = Math.random(); } }); // snow or petals
  den.hearts.forEach(p => { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; });
  den.hearts = den.hearts.filter(p => p.age < p.life);
  if (den.snack) updateSnack(dt);
  if (den.ball) updateBall(dt);
}
const SNACK_FALL = 0.8, SNACK_BITE = 0.45;
function updateSnack(dt) {
  const s = den.snack, was = Math.floor((s.t - SNACK_FALL) / SNACK_BITE);
  s.t += dt;
  if (s.t < SNACK_FALL) return;
  const bites = Math.floor((s.t - SNACK_FALL) / SNACK_BITE);
  if (bites !== was && bites <= 3) { s.bites = bites; SFX.munch(); }
  if (bites >= 3) { den.snack = null; den.happyT = 1.4; denHop(-380); SFX.giggle(); heartsAt(denX(), GY - DEN_HEIGHT[S.char] * denScale() * 0.9, 8); }
}
function updateBall(dt) {
  const b = den.ball, r = ballRadius();
  b.vy += 1500 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vx * dt * 0.02;
  if (b.x < r || b.x > W - r) { b.x = clamp(b.x, r, W - r); b.vx = -b.vx; }
  if (b.y > GY - r) bounceBall(b, r);
  b.rest = b.vy === 0 ? b.rest + dt : 0;
  den.headT -= dt;
  if (b.rest > 1.2) kickBall((denX() - b.x) * 1.1 + rand(-60, 60)); // she gives it a nudge
  if (den.headT <= 0 && ballOnHead(b)) { den.headT = 0.5; kickBall(rand(-280, 280)); den.happyT = 0.9; denHop(-300); SFX.giggle(); }
}
function bounceBall(b, r) { // it hits the grass: lose some bounce, and come to rest when it is nearly still
  b.y = GY - r; b.vy = Math.abs(b.vy) > 160 ? -b.vy * 0.62 : 0; b.vx *= 0.9;
  if (b.vy) SFX.bounce();
}
function ballOnHead(b) { // coming down onto the hero's head
  const k = denScale(), headY = GY - DEN_HEIGHT[S.char] * k * 0.85 - den.h;
  return b.vy > 0 && Math.abs(b.x - denX()) < 70 * k && Math.abs(b.y - headY) < 26 * k;
}

// ------------------------------------------------------------------ drawing
function denPose(time) { // the hero's pose: breathing in place, happy, hopping, chewing or watching the ball
  const L = LOOKS[S.char], o = { face: { eyes: (time * 1000) % 3100 < 120 ? 'closed' : 'open', mouth: 'smile' } };
  L.walk(o, 0);
  if (den.ball) L.look(o, clamp((den.ball.x - denX()) / 30, -5, 5), clamp((den.ball.y - (GY - 100)) / 40, -4, 4));
  if (den.h > 0) { o.face.mouth = 'O'; L.air(o); }
  if (den.happyT > 0) { o.face.mouth = 'grin'; L.happy(o, time); }
  if (den.snack) o.face.mouth = den.snack.t < SNACK_FALL ? 'O' : Math.sin(time * 28) > 0 ? 'open' : 'smile';
  return o;
}
function drawDen(time) {
  denLook(); camX = 0;
  drawSky(time); drawGround();
  [[0.12, 'small', 0.8], [0.84, 'small', 1], [0.93, 'tree', 1]].forEach(([fx, kind, s], i) => { // a little scenery, standing on the grass
    const name = kind === 'tree' ? TH.trees[0] : TH.small[i % TH.small.length];
    drawDeco({ x: fx * W, kind: name, s, seed: 0.3 + i * 0.2 }, time);
  });
  drawDenHero(time);
  if (den.snack) drawFallingSnack();
  if (den.ball) drawBall(den.ball, ballRadius());
  den.hearts.forEach(drawSparkle);
  den.bits.forEach(f => { ctx.fillStyle = f.c; ctx.fillRect(f.x * W, f.y * GY, f.s, f.s); });
}
function drawDenHero(time) {
  const L = LOOKS[S.char], k = denScale(), x = denX();
  drawShadow(x + L.shadow[0] * k, den.h, L.shadow[1] * k);
  OUTFIT = outfitOf(S.char);
  ctx.save(); ctx.translate(x, GY - den.h); ctx.scale(k, k);
  L.draw({ x: 0, y: 0, squash: den.squash }, time, denPose(time));
  ctx.restore();
}
function drawFallingSnack() {
  const s = den.snack, k = denScale(), [mx, my] = DEN_MOUTH[S.char];
  const tx = denX() + mx * k, ty = GY - den.h + my * k, fall = easeInOut(s.t / SNACK_FALL);
  drawSnack(s.kind, tx, lerp(-30, ty - 4 * k, fall), k * 0.9 * (1 - 0.22 * s.bites)); // a bite smaller each time
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
function drawBall(b, r) {
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot); const s = r / 16;
  ctx.scale(s, s); roundBlob(0, 0, 16, 16, '#2b2140'); roundBlob(0, 0, 14, 14, '#ffffff');
  pixel(-14, -3, 28, 6, '#e8322b'); pixel(-3, -14, 6, 28, '#4dabf7'); pixel(-14, -14, 8, 6, '#ffffff'); pixel(-6, -9, 4, 4, 'rgba(255,255,255,.9)');
  ctx.restore();
}

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
  $('denPlay').setAttribute('aria-pressed', den.ball ? 'true' : 'false');
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
$('denBtn').addEventListener('click', openDen);
$('denBack').addEventListener('click', closeDen);
$('denFeed').addEventListener('click', () => { audioInit(); feed(); });
$('denPlay').addEventListener('click', () => { audioInit(); togglePlay(); syncDenButtons(); });
$('denDress').addEventListener('click', () => { audioInit(); setTray(den.tray === 'dress' ? null : 'dress'); });
$('denTray').addEventListener('click', e => { const c = e.target.closest('.chip'); if (c) { audioInit(); choose(c.dataset.kind, c.dataset.value); } });
cv.addEventListener('pointerdown', ev => { // tap the hero to pet them, or the ball to kick it
  if (!den.on) return;
  audioInit();
  const [x, y] = worldPoint(ev), k = denScale(), b = den.ball;
  if (b && Math.hypot(x - b.x, y - b.y) < ballRadius() * 2.2) { kickBall(rand(-300, 300)); return; }
  if (Math.abs(x - denX()) < 70 * k && y > GY - DEN_HEIGHT[S.char] * k - den.h - 10 && y < GY + 20) pet();
});
