// Game state and rules: the journey, questions, Nibblers, building, input and the update loop.
'use strict';

// ------------------------------------------------------------------ layout
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  const vw = window.innerWidth, vh = window.innerHeight;
  cv.width = Math.round(vw * DPR); cv.height = Math.round(vh * DPR);
  SC = Math.min(vw / 560, vh / 470);
  W = vw / SC; H = vh / SC;
  GY = H - Math.max(132, H * 0.24);
  OX = W - Math.max(150, (LV ? LV.ext.w / 2 : 120) + 40);
  if (hero.onGround) hero.y = GY;
}

// ------------------------------------------------------------------ game state
let LV = null, levelIdx = 0, gen = 0, now = 0, phase = 'menu', playing = false;
let camX = 0, stops = [], stopIdx = 0, siteCam = 0, spawns = [], decos = [];
let status = [], builtAt = [], buildIdx = -1, carry = null, flyers = [];
let items = [], nibs = [], parts = [], pops = [], hint = null, round = null, qi = 0, recent = [];
const keys = { left: false, right: false };
let lastMoveT = 0;
let lastProgress = 0, nibIntro = false, nextAskSpawn = 0, blockedSince = -1, shake = 0, stepT = 0, smokeT = 0;
let flakes = [];
const tasks = [];
function later(delay, fn) { const g = gen; tasks.push({ at: now + delay, fn, g }); }
function runTasks() { for (let i = tasks.length - 1; i >= 0; i--) { const t = tasks[i]; if (t.g !== gen) { tasks.splice(i, 1); continue; } if (now >= t.at) { tasks.splice(i, 1); t.fn(); } } }
const siteX = () => siteCam + OX;
const heroSX = () => hero.x - camX;

function burst(x, y, n, cols, sp = [120, 380], size = [4, 9], life = 0.7, g = 600, up = 0) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = rand(sp[0], sp[1]);
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - up, g, life: life * rand(0.7, 1.2), age: 0, s: rand(size[0], size[1]), c: pick(cols), rot: rand(0, 6), vr: rand(-8, 8) }); }
}
function puff(x, y, vx, vy, s, c, life, grow = 1.6) { parts.push({ kind: 'cloud', x, y, vx, vy, g: -20, life, age: 0, s, c, grow, rot: 0, vr: 0 }); }
function popText(text, x, y, size = 40, color = '#ffd23f', life = 1.1) { pops.push({ text, x, y, size, color, life, age: 0 }); }

function startLevel(i) {
  gen++; tasks.length = 0; stopVoice();
  levelIdx = i; LV = LEVELS[i]; TH = THEMES[LV.theme]; GT = themeTextures(TH);
  resize();
  const n = LV.pieces.length, SEG = 640, FIRST = 520;
  stops = Array.from({ length: n }, (_, k) => FIRST + k * SEG);
  siteCam = stops[n - 1] + SEG * 0.85;
  stopIdx = 0; camX = 0; hero.x = PSX; hero.face = 1; hero.tx = null; keys.left = keys.right = false; applyControls(); hero.y = GY; hero.vy = 0; hero.onGround = true; hero.dance = false; hero.actT = 0; hero.happyT = 0;
  LV.pieces.forEach(p => p.blocks.forEach(b => { b._played = false; }));
  status = LV.pieces.map(() => 'todo'); builtAt = LV.pieces.map(() => -1); buildIdx = -1; carry = null; flyers = [];
  items = []; nibs = []; parts = []; pops = []; hint = null; round = null; nibIntro = false; blockedSince = -1;
  // nibbler ambush points along the path (none before the first stop, so children can learn the controls)
  spawns = [];
  const D = S.diff;
  for (let k = 1; k <= n; k++) {
    const a = stops[k - 1] + 60, b = k < n ? stops[k] - 60 : siteCam + PSX - 60;
    const count = D === 'easy' ? (k % 2 === 1 ? 1 : 0) : D === 'medium' ? 1 + (k % 3 === 0 ? 1 : 0) : 2 + (k % 2);
    for (let j = 0; j < count; j++) spawns.push({ x: lerp(a, b, 0.25 + 0.5 * (j + 0.5) / count), behind: Math.random() < DIFF[D].behind, done: false });
  }
  // scenery
  const r = seeded(100 + i * 17); decos = [];
  for (let x = 160; x < siteCam + 40; x += 110 + r() * 160) {
    if (stops.some(s => Math.abs(x - (s + 140)) < 70)) continue;
    decos.push({ x, kind: r() < 0.55 ? TH.trees[Math.floor(r() * TH.trees.length)] : TH.small[Math.floor(r() * TH.small.length)], s: 0.8 + r() * 0.4, seed: r() });
  }
  decos.sort((p, q) => (isTree(p.kind) ? 0 : 1) - (isTree(q.kind) ? 0 : 1));
  flakes = TH.snow ? Array.from({ length: 50 }, () => ({ x: rand(0, 1), y: rand(0, 1), s: rand(2, 5), v: rand(20, 45) })) : [];
  // HUD
  $('bag').innerHTML = LV.pieces.map((p, k) => { p.icon = p.icon || pieceIcon(p); return `<span class="bslot" id="slot${k}"><img src="${p.icon}" alt=""></span>`; }).join('');
  $('prompt').classList.add('away');
  const act = $('actBtn'); act.textContent = S.char === 'henry' ? 'TRUMP!' : 'ACHOO!'; act.setAttribute('aria-label', S.char === 'henry' ? 'Trump' : 'Sneeze'); act.classList.toggle('henry', S.char === 'henry');
  playing = true; phase = 'intro';
  ['title', 'levels', 'finish', 'settings'].forEach(id => { $(id).hidden = true; });
  $('hud').hidden = false; $('controls').hidden = false;
  talk(['hi_' + S.char, 0.2, LV.go]);
  hero.happyT = 1.4;
  later(3.8, () => { if (phase === 'intro') phase = 'walk'; });
}
const isTree = k => ['oak', 'pine', 'palm', 'snowpine'].includes(k);

function setSlot(i, cls, popIt = true) {
  const el = $('slot' + i); if (!el) return;
  el.className = 'bslot ' + cls;
  if (popIt && !reduceMotion) { void el.offsetWidth; el.classList.add('pop'); }
}
function slotPos(i) {
  const el = $('slot' + i), c = cv.getBoundingClientRect();
  if (!el) return [40, 40];
  const r = el.getBoundingClientRect();
  return [(r.left + r.width / 2 - c.left) / SC, (r.top + r.height / 2 - c.top) / SC];
}

// ------------------------------------------------------------------ questions
function setPrompt(bigHTML, pic, slots, slotClass) {
  $('pBig').innerHTML = bigHTML; $('pPic').textContent = pic || '';
  $('pSlots').innerHTML = slots ? Array.from({ length: slots }, () => `<span class="slot ${slotClass}"></span>`).join('') : '';
  const p = $('prompt'); p.classList.remove('away', 'pop'); void p.offsetWidth; p.classList.add('pop');
}
const gHTML = id => { const s = showG(id); return s.length > 1 ? `<small>${s[0]}</small>${s[1]}` : s[0]; };
function fillSlot(i) { const s = $('pSlots').children[i]; if (s) s.classList.add('on'); }
function chooseGrapheme() {
  const p = pool(); let opts = p.filter(x => !recent.includes(x)); if (!opts.length) opts = p;
  const g = pick(opts); recent.push(g); if (recent.length > Math.min(4, p.length - 1)) recent.shift();
  return g;
}
function distractors(target, n) {
  const bad = clashes(target);
  const ok = list => shuffle(list.filter((x, i, a) => a.indexOf(x) === i && !bad.has(x)));
  let d = ok(pool());
  if (d.length < n) d = d.concat(ok(taughtSoFar()).filter(x => !d.includes(x)));
  if (d.length < n) d = d.concat(ok(Object.keys(G)).filter(x => !d.includes(x)));
  const out = [];
  for (const x of d) { if (out.every(y => !clashes(y).has(x))) out.push(x); if (out.length === n) break; }
  return out;
}
// answers float in front of the hero, clear of the hero's body
function optionSpots(n) {
  const P = heroSX(), x0 = P + 125, x1 = Math.min(P + 125 + (n - 1) * 92, W - 50);
  return Array.from({ length: n }, (_, i) => ({ x: n === 1 ? x0 : lerp(x0, x1, i / (n - 1)), y: GY - 135 - (i % 2) * 42 }));
}
function makeOptions(vals, kind) {
  items = optionSpots(vals.length).map((p, i) => ({ kind, val: vals[i], x: p.x, y: p.y, born: now + i * 0.12, ph: rand(0, 6), wob: 0, cool: 0, state: 'idle',
    col: BLOCK_COLS[(typeof vals[i] === 'number' ? vals[i] : vals[i].charCodeAt(0) + vals[i].length) % BLOCK_COLS.length] }));
}
function makeGems(n) {
  const P = heroSX(), spots = [];
  const xa = P + 105, xb = Math.max(xa + 140, W - 45), ya = Math.max(GY - 300, 120), yb = GY - 70;
  for (let i = 0; i < n; i++) {
    let x, y, tries = 0;
    do { x = rand(xa, xb); y = rand(ya, yb); tries++; } while (tries < 60 && spots.some(s => Math.hypot(s[0] - x, s[1] - y) < 66));
    spots.push([x, y]);
  }
  items = spots.map(([x, y], i) => ({ kind: 'gem', x, y, born: now + i * 0.1, ph: rand(0, 6), state: 'idle', hue: pick(['#3fd0e8', '#ff7ab0', '#ffd23f', '#8be04e']) }));
}
function promptParts() {
  const r = round; if (!r) return [];
  if (phase === 'place') return ['place'];
  if (r.type === 'match') return ['find', 's_' + r.target, 0.25, 's_' + r.target, 'w_' + r.target];
  if (r.type === 'listen') return ['which', 's_' + r.target, 0.3, 's_' + r.target, 'w_' + r.target];
  if (r.type === 'number') return ['numfind', 'n' + r.target];
  if (r.type === 'count') return ['collect', 'n' + r.n, 'gems'];
  return [];
}
function askQuestion(where, intro = []) {
  const plan = PLANS[S.mode] || PLANS.both;
  const type = plan[qi++ % plan.length];
  hint = null; round = { type, where, got: 0 };
  if (type === 'match' || type === 'listen') {
    const g = chooseGrapheme(); round.target = g;
    makeOptions(shuffle([g, ...distractors(g, 2)]), 'grapheme');
    if (type === 'match') setPrompt(gHTML(g), ''); else setPrompt('', '🔊' + G[g][2]);
  } else if (type === 'number') {
    const max = S.nums, n = 1 + Math.floor(Math.random() * max); round.target = n;
    const others = shuffle(Array.from({ length: Math.max(max, 6) }, (_, i) => i + 1).filter(x => x !== n)).slice(0, 2);
    makeOptions(shuffle([n, ...others]), 'number');
    setPrompt(String(n), '');
  } else {
    const n = S.nums === 10 ? 3 + Math.floor(Math.random() * 5) : 2 + Math.floor(Math.random() * 4); round.n = n;
    makeGems(n); setPrompt('', '💎', n, 'gem');
  }
  phase = where === 'build' ? 'bask' : 'ask';
  lastProgress = now; nextAskSpawn = now + (DIFF[S.diff].askSpawn || 999);
  const introText = intro.map(k => TEXT[k] || '').join(' ');
  talk([...intro, ...(intro.length ? [0.3] : []), ...promptParts()], type === 'count' ? { cap: `${introText} Collect ${NUMWORD[round.n]} gems!`.trim() } : {});
}
function chooseItem(it) {
  if ((phase !== 'ask' && phase !== 'bask') || !round || it.state !== 'idle' || now < it.born) return;
  if (it.kind === 'gem') {
    it.state = 'got'; round.got++; fillSlot(round.got - 1); progress();
    SFX.gem(round.got); burst(it.x, it.y, 14, [it.hue, '#ffffff'], [80, 240], [3, 6], 0.5, 200);
    popText(String(round.got), it.x, it.y - 36, 50, '#ffffff');
    if (round.got >= round.n) { talk(['n' + round.n, 'gemsdone'], { cap: `${NUMWORD[round.n][0].toUpperCase() + NUMWORD[round.n].slice(1)} gems! Brilliant counting!` }); answered(it.x, it.y, 2.6); }
    else talk(['n' + round.got], { show: false });
    return;
  }
  if (it.cool > now) return;
  if (it.val === round.target) {
    progress(); SFX.good(); hero.happyT = 1.2;
    burst(it.x, it.y - 32, 24, ['#ffd23f', '#ffffff', rgb(it.col)], [120, 340], [4, 8], 0.7, 300);
    items.forEach(o => { if (o.state === 'idle') { o.state = 'poof'; o.t0 = now; } });
    if (round.type === 'number') {
      const n = round.target;
      talk([yes(), 'count', ...Array.from({ length: n }, (_, i) => 'n' + (i + 1))]);
      for (let i = 0; i < n; i++) later(1.0 + i * 0.62, () => { popText(String(i + 1), it.x - (n - 1) * 15 + i * 30, it.y - 100, 30, '#ffffff', 0.9); SFX.gem(i); });
      answered(it.x, it.y - 32, 1.6 + n * 0.62);
    } else {
      talk([yes(), 's_' + round.target, 0.2, 's_' + round.target, 'w_' + round.target]);
      answered(it.x, it.y - 32, 3.0);
    }
  } else {
    it.cool = now + 2.2; it.wob = 1; hero.wrongT = 0.6; SFX.wrong(); progress();
    if (round.type === 'number') talk(['thats', 'n' + it.val, 'canyou', 'n' + round.target]);
    else talk(['thatone', 's_' + it.val, 'letsfind', 's_' + round.target, 'w_' + round.target]);
  }
}
function progress() { lastProgress = now; hint = null; }
// a correct answer: on the journey you win the next piece; at the site the piece comes out to be placed
function answered(fx, fy, wait) {
  $('prompt').classList.add('away');
  if (round.where === 'journey') {
    phase = 'reward';
    const i = stopIdx;
    later(Math.min(1.2, wait * 0.4), () => {
      const [tx, ty] = slotPos(i);
      flyers.push({ piece: i, x0: fx, y0: fy, x1: tx, y1: ty, t0: now, dur: 0.9, s0: 0.9, s1: 26 / Math.max(LV.pieces[i].ext.w, LV.pieces[i].ext.h), arc: 140,
        done: () => { if (status[i] === 'todo') { status[i] = 'held'; setSlot(i, 'held'); SFX.pick(); } } });
    });
    later(wait, () => talk(['found', LV.pieces[i].clip], { interrupt: false }));
    later(wait + 2.2, () => { stopIdx++; items = []; round = null; if (phase === 'reward') phase = 'walk'; });
  } else {
    phase = 'carry';
    const i = buildIdx;
    later(Math.min(1.2, wait * 0.4), () => {
      const [sx, sy] = slotPos(i), s1 = Math.min(1, 110 / Math.max(LV.pieces[i].ext.w, LV.pieces[i].ext.h));
      setSlot(i, 'out', false);
      flyers.push({ piece: i, x0: sx, y0: sy, x1: heroSX() + 95, y1: GY - 230, t0: now, dur: 0.8, s0: 26 / Math.max(LV.pieces[i].ext.w, LV.pieces[i].ext.h), s1, arc: 60,
        done: () => { carry = { piece: i, x: heroSX() + 95, y: GY - 230, s: s1, t0: now }; phase = 'place'; lastProgress = now; } });
    });
    later(wait, () => talk(['place'], { interrupt: false }));
  }
}
function placePiece() {
  if (phase !== 'place' || !carry) return;
  phase = 'building'; progress();
  const i = carry.piece, bx = pieceBoxScreen(i);
  flyers.push({ piece: i, x0: carry.x, y0: carry.y, x1: bx.cx, y1: bx.cy, t0: now, dur: 0.6, s0: carry.s, s1: 1, arc: 70,
    done: () => { status[i] = 'built'; builtAt[i] = now; setSlot(i, 'built'); burst(bx.cx, bx.cy, 26, ['#ffd23f', '#ffffff', '#ff7ab0'], [120, 320], [4, 8], 0.8, 300); hero.happyT = 1.4; SFX.good(); } });
  carry = null; SFX.pick();
  later(2.4, nextBuild);
}
function nextBuild() {
  const i = status.findIndex(s => s === 'held' || s === 'lost');
  if (i < 0) { finishLevel(); return; }
  buildIdx = i;
  askQuestion('build', [status[i] === 'lost' ? 'recover' : 'build', LV.pieces[i].clip]);
}
function finishLevel() {
  phase = 'done'; $('prompt').classList.add('away');
  const gone = status.filter(s => s === 'gone').length, built = status.filter(s => s === 'built').length;
  talk([built === 0 ? 'again' : gone ? 'kept' : 'done']);
  hero.dance = true; SFX.party();
  for (let k = 0; k < 6; k++) later(k * 0.45, () => { burst(rand(80, W - 80), rand(80, GY - 200), 30, ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#f783ac'], [150, 380], [4, 8], 1.2, 250); SFX.pop(); });
  if (built > 0 && levelIdx + 1 >= S.unlocked && levelIdx + 1 < LEVELS.length) { S.unlocked = levelIdx + 2; saveSettings(); }
  later(4.2, () => {
    $('finTitle').innerHTML = built === 0 ? 'Oh no, <span>Nibblers!</span>' : `${LV.name} <span>built!</span>`;
    $('finText').textContent = built === 0 ? 'The Nibblers took every piece this time. Try again and blow them away before they run off!' : gone ? `Built with ${built} of ${LV.pieces.length} pieces. Keep the Nibblers away to finish it next time!` : 'Every piece is in place. Brilliant building!';
    $('nextBtn').hidden = levelIdx + 1 >= LEVELS.length || levelIdx + 1 >= S.unlocked;
    renderPreview($('cvFinish'), levelIdx, status.map(s => s === 'built'));
    $('finish').hidden = false;
    ($('nextBtn').hidden ? $('againBtn') : $('nextBtn')).focus();
  });
}

// ------------------------------------------------------------------ nibblers
const activeNib = n => n.state === 'pop' || n.state === 'walk' || n.state === 'nibble' || n.state === 'gloat' || (n.state === 'flee' && onScreen(n));
const onScreen = n => { const sx = n.x - camX; return sx > -70 && sx < W + 70; };
function spawnNib(behind, returned = false) {
  if (phase === 'arrive' || phase === 'bask' || phase === 'carry' || phase === 'place' || phase === 'building' || phase === 'done') return;
  const D = DIFF[S.diff];
  if (behind) nibs.push({ x: camX - 50, y: GY, dir: 1, state: 'walk', speed: D.speed * 1.3, ph: rand(0, 6), t: 0, returned });
  else {
    const x = hero.x + Math.min(330, W - PSX - 70);
    nibs.push({ x, y: GY, dir: -1, state: 'pop', speed: D.speed, ph: rand(0, 6), t: 0, returned });
    burst(x - camX, GY, 14, [rgb(TH.dirt), rgb(TH.top)], [80, 240], [4, 9], 0.6, 900, 200); SFX.dig();
  }
  if (!nibIntro) { nibIntro = true; talk(['nib_' + S.char]); }
}
function heldPieces() { return status.map((s, i) => s === 'held' ? i : -1).filter(i => i >= 0); }
function updateNibs(dt) {
  const D = DIFF[S.diff], contact = S.char === 'henry' ? 62 : 48;
  nibs.forEach(n => {
    n.ph += dt * 8; n.t += dt;
    if (n.state === 'pop') { if (n.t > 0.45) { n.state = 'walk'; n.t = 0; } return; }
    if (n.state === 'walk') {
      n.x += n.dir * n.speed * dt;
      const dx = hero.x - n.x;
      if (Math.abs(dx) < contact) {
        if (hero.y > GY - 35) { n.state = 'nibble'; n.t = 0; n.x = hero.x - Math.sign(dx || 1) * contact; SFX.nibble(); }
      } else if (Math.sign(dx) !== n.dir) { // jumped over: easy ones give up, others turn round
        if (S.diff === 'easy') { n.state = 'leave'; n.speed = 60; } else n.dir = -n.dir;
      }
    } else if (n.state === 'nibble') {
      if (Math.abs(hero.x - n.x) > contact + 14) { n.state = 'walk'; n.dir = Math.sign(hero.x - n.x); return; } // the hero walked off: chase
      if (Math.floor(n.t / 0.6) !== Math.floor((n.t - dt) / 0.6)) { SFX.nibble(); burst(heroSX() + (n.x < hero.x ? -30 : 30), GY - 70, 4, ['#c4945a', '#9a9aa6'], [40, 120], [2, 4], 0.4, 500, 60); }
      const held = heldPieces();
      if (D.steal && held.length && n.t > D.nibble) {
        const i = held[held.length - 1];
        status[i] = 'stolen'; setSlot(i, 'stolen'); n.carry = i; n.state = 'gloat'; n.dir = n.x < hero.x ? -1 : 1; n.speed = 95; n.t = 0;
        SFX.steal(); talk(['took', LV.pieces[i].clip, D.steal === 'later' ? 'later' : 'gone']);
      } else if (D.leave && n.t > D.leave) { n.state = 'leave'; n.dir = n.x < hero.x ? -1 : 1; n.speed = 60; }
    } else if (n.state === 'gloat') { // a cheeky victory hop gives children time to blow the thief away
      if (n.t > 0.9) { n.state = 'flee'; n.t = 0; }
      if (Math.floor(n.t / 0.3) !== Math.floor((n.t - dt) / 0.3)) tone(900 + rand(0, 200), 0.08, 'square', 0.05, 1300);
    } else if (n.state === 'flee' || n.state === 'leave') {
      n.x += n.dir * n.speed * dt;
      if (!onScreen(n)) {
        n.dead = true;
        if (n.carry != null && status[n.carry] === 'stolen') { const lost = D.steal === 'gone' ? 'gone' : 'lost'; status[n.carry] = lost; setSlot(n.carry, lost); }
      }
    } else if (n.state === 'fly') {
      n.vy += 1300 * dt; n.x += n.vx * dt; n.y += n.vy * dt; n.rot += n.vr * dt;
      if (n.y > H + 150) n.dead = true;
    }
  });
  nibs = nibs.filter(n => !n.dead);
}
function blast() {
  let hit = false;
  nibs.forEach(n => {
    if (!(n.state === 'pop' || n.state === 'walk' || n.state === 'nibble' || n.state === 'gloat' || n.state === 'flee' || n.state === 'leave')) return;
    if (Math.abs(n.x - hero.x) > 430) return;
    const away = n.x >= hero.x ? 1 : -1;
    if (n.carry != null && status[n.carry] === 'stolen') { // blew the thief away: the piece comes back
      const i = n.carry, [tx, ty] = slotPos(i);
      flyers.push({ piece: i, x0: n.x - camX, y0: n.y - 70, x1: tx, y1: ty, t0: now, dur: 0.8, s0: 0.45, s1: 26 / Math.max(LV.pieces[i].ext.w, LV.pieces[i].ext.h), arc: 120,
        done: () => { status[i] = 'held'; setSlot(i, 'held'); } });
      later(0.5, () => talk(['gotback']));
      n.carry = null;
    }
    n.state = 'fly'; n.vx = away * rand(280, 400); n.vy = rand(-780, -640); n.vr = rand(-12, 12); hit = true;
    SFX.whee();
    const D = DIFF[S.diff];
    if (!n.returned && Math.random() < D.returnP) later(3.5, () => spawnNib(away < 0, true));
  });
  if (hit) { progress(); hero.happyT = Math.max(hero.happyT, 0.9); blockedSince = -1; }
}
function tryJump() { if (playing && hero.onGround && hero.actT <= 0 && !hero.dance) { hero.vy = -560; hero.onGround = false; SFX.jump(); } }
function tryAction() {
  if (!playing || hero.actT > 0 || hero.dance) return;
  hero.actT = 0.9; hero.acted = false;
  if (S.char === 'henry') { SFX.hmm(0); later(0.18, () => SFX.hmm(1)); } else { SFX.ah(0); later(0.22, () => SFX.ah(1)); }
}
function actionBlast() {
  const sx = heroSX(), henry = S.char === 'henry';
  if (henry) {
    const f = hero.face || 1;
    SFX.trump(); popText('PARP!', clamp(sx - 30 * f, 80, W - 80), GY - 165, 36, '#d6f59a', 0.9);
    for (let i = 0; i < 26; i++) puff(sx - 56 * f, GY - 62 + rand(-10, 10), -f * rand(80, 420), rand(-60, 30), rand(10, 20), pick(['#d7efb0', '#c4e39a', '#e6f5c8', '#cfe7a6']), rand(0.7, 1.3));
    for (let i = 0; i < 16; i++) { const a = rand(-0.4, 0.4), v = rand(260, 480); puff(sx, GY - 50, Math.cos(a) * v, Math.sin(a) * 60 - 20, rand(8, 14), '#e3f3c6', rand(0.5, 0.9)); }
    hero.trumps++;
    if (hero.trumps % 3 === 0 && !talking()) later(0.6, () => talk(['pardon']));
  } else {
    SFX.achoo(); popText('ACHOO!', sx, GY - 210, 40, '#ffd23f', 0.9);
    for (let i = 0; i < 40; i++) { const dir = i % 2 ? 1 : -1, a = rand(-0.6, 0.6), v = rand(300, 760);
      parts.push({ x: sx + dir * 30, y: GY - 110, vx: dir * Math.cos(a) * v, vy: Math.sin(a) * v - 60, g: 120, life: rand(0.5, 0.9), age: 0, s: rand(5, 13), c: pick(['#f4fbff', '#e0f3ff', '#d5f5c8']), rot: rand(0, 6), vr: rand(-6, 6) }); }
  }
  shake = reduceMotion ? 0 : 10;
  blast();
}

// ------------------------------------------------------------------ input
function worldPoint(ev) { const r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) / SC, (ev.clientY - r.top) / SC]; }
function itemHit(it, x, y) {
  if (it.kind === 'gem') return Math.hypot(x - it.x, y - it.y) < 40;
  return Math.abs(x - it.x) < 44 && y > it.y - 84 && y < it.y + 14;
}
function heroHit(x, y) {
  const sx = heroSX(), f = hero.face || 1, a = sx - (f > 0 ? 62 : 80), b = sx + (f > 0 ? 80 : 62);
  return S.char === 'henry' ? (x > a && x < b && y > hero.y - 125 && y < hero.y + 8) : (Math.abs(x - sx) < 46 && y > hero.y - 175 && y < hero.y + 8);
}
function pieceBoxScreen(i) {
  const e = LV.pieces[i].ext, sx = siteX() - camX;
  const x0 = sx + e.c0 * BS - BS / 2, x1 = sx + e.c1 * BS + BS / 2, y0 = GY - (e.r1 + 1) * BS, y1 = GY - e.r0 * BS;
  return { x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
cv.addEventListener('pointerdown', ev => {
  if (!playing) return;
  audioInit();
  const [x, y] = worldPoint(ev);
  if (phase === 'place' && carry) {
    const b = pieceBoxScreen(carry.piece), pad = 36;
    if (x > b.x0 - pad && x < b.x1 + pad && y > b.y0 - pad && y < b.y1 + pad) { placePiece(); return; }
  }
  if (phase === 'ask' || phase === 'bask') for (const it of items) if (it.state === 'idle' && itemHit(it, x, y)) { chooseItem(it); return; }
  for (const n of nibs) if (activeNib(n) && Math.abs(x - (n.x - camX)) < 48 && Math.abs(y - (n.y - 24)) < 48) { tryAction(); return; }
  if (heroHit(x, y)) { tryJump(); return; }
  if (S.move === 'manual' && phase === 'walk' && y > GY - 70) hero.tx = camX + x; // tap the ground to walk there
});
function holdBtn(el, fn) {
  el.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); el.classList.add('down'); fn(); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => el.addEventListener(t, () => el.classList.remove('down')));
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
}
function holdGate(el, ms, fn) {
  let t0 = 0, raf = 0;
  const stop = () => { cancelAnimationFrame(raf); t0 = 0; el.style.setProperty('--hold', '0%'); };
  const tick = () => { const k = (performance.now() - t0) / ms; el.style.setProperty('--hold', Math.min(100, k * 100) + '%'); if (k >= 1) { stop(); fn(); } else raf = requestAnimationFrame(tick); };
  el.addEventListener('pointerdown', e => { e.preventDefault(); t0 = performance.now(); raf = requestAnimationFrame(tick); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => el.addEventListener(t, stop));
  el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); fn(); } });
}
holdBtn($('jumpBtn'), tryJump);
holdBtn($('actBtn'), tryAction);
$('replay').addEventListener('click', () => { audioInit(); if (round && (phase === 'ask' || phase === 'bask' || phase === 'place')) talk(promptParts(), round.type === 'count' && phase !== 'place' ? { cap: `Collect ${NUMWORD[round.n]} gems!` } : {}); });
$('musicBtn').addEventListener('click', () => { audioInit(); setMusic(!S.music); });
function goTitle() {
  gen++; tasks.length = 0; stopVoice(); playing = false; phase = 'menu'; LV = null; nibs = []; items = []; flyers = []; carry = null;
  $('hud').hidden = true; $('controls').hidden = true; $('finish').hidden = true; $('levels').hidden = true; $('title').hidden = false;
  resize();
}
holdGate($('homeBtn'), 900, goTitle);
holdGate($('grownBtn'), 1200, openSettings);
$('setDone').addEventListener('click', () => { readSettings(); $('settings').hidden = true; applyControls(); });
addEventListener('keydown', e => {
  if (!playing || isPaused()) return;
  if (e.key === 'ArrowUp' || (e.key === ' ' && e.target === document.body)) { e.preventDefault(); tryJump(); }
  if (e.key === 'ArrowDown' || e.key === 'x') tryAction();
  if (e.key === 'ArrowLeft') { keys.left = true; e.preventDefault(); }
  if (e.key === 'ArrowRight') { keys.right = true; e.preventDefault(); }
});
addEventListener('keyup', e => { if (e.key === 'ArrowLeft') keys.left = false; if (e.key === 'ArrowRight') keys.right = false; });
// hold-to-walk arrow buttons (manual movement)
[['leftBtn', 'left'], ['rightBtn', 'right']].forEach(([id, k]) => {
  const el = $(id);
  el.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); keys[k] = true; el.classList.add('down'); try { el.setPointerCapture(e.pointerId); } catch (err) { /* not supported */ } });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => el.addEventListener(t, () => { keys[k] = false; el.classList.remove('down'); }));
});
function applyControls() {
  const manual = S.move === 'manual';
  $('controls').classList.toggle('manual', manual); $('moveGrp').hidden = !manual;
  if (!manual) { keys.left = keys.right = false; hero.tx = null; }
}
function isPaused() { return !$('settings').hidden || !$('studio').hidden; }
function openSettings() { keys.left = keys.right = false; fillSettingsUI(); $('settings').hidden = false; $('setDone').focus(); }
holdGate($('gearBtn'), 700, openSettings);
document.querySelectorAll('.mode').forEach(b => b.addEventListener('click', () => { S.mode = b.dataset.mode; saveSettings(); syncModeButtons(); }));
document.querySelectorAll('.char').forEach(b => b.addEventListener('click', () => {
  audioInit(); S.char = b.dataset.char; saveSettings(); talk(['hi_' + S.char]); showLevels();
}));
function showLevels() {
  $('lvlGrid').innerHTML = LEVELS.map((L, i) => `<button class="lvl" data-lvl="${i}" ${i >= S.unlocked ? 'disabled aria-disabled="true"' : ''} aria-label="${L.name}${i >= S.unlocked ? ', locked' : ''}">
    <canvas width="320" height="240"></canvas><b>${L.name}</b><small>OUTPOST ${i + 1}</small>
    <svg class="lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="12" fill="#ffd23f" stroke="#2b2140" stroke-width="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#2b2140" stroke-width="2.5"/></svg></button>`).join('');
  $('lvlGrid').querySelectorAll('.lvl').forEach(b => {
    const i = +b.dataset.lvl; renderPreview(b.querySelector('canvas'), i, null);
    b.addEventListener('click', () => { if (i < S.unlocked) { audioInit(); startLevel(i); } });
  });
  $('diffChip').textContent = `${DIFF[S.diff].name} · ${S.char === 'henry' ? 'Mr Henry' : 'Bob'}`;
  $('title').hidden = true; $('levels').hidden = false;
}
$('lvlBack').addEventListener('click', () => { $('levels').hidden = true; $('title').hidden = false; });
$('nextBtn').addEventListener('click', () => { audioInit(); startLevel(Math.min(levelIdx + 1, LEVELS.length - 1)); });
$('againBtn').addEventListener('click', () => { audioInit(); startLevel(levelIdx); });
$('pickBtn').addEventListener('click', () => { gen++; tasks.length = 0; $('finish').hidden = true; playing = false; LV = null; $('hud').hidden = true; $('controls').hidden = true; showLevels(); });

// ------------------------------------------------------------------ update
function update(dt) {
  now += dt;
  runTasks();
  const blocked = nibs.some(activeNib);
  // walking along the path
  let walking = false;
  if (phase === 'walk' && hero.actT <= 0 && !hero.dance) {
    let dir = 0;
    if (S.move === 'auto') dir = blocked ? 0 : 1;
    else if (keys.left !== keys.right) { dir = keys.left ? -1 : 1; hero.tx = null; }
    else if (hero.tx != null) { const d = hero.tx - hero.x; if (Math.abs(d) > 6) dir = Math.sign(d); else hero.tx = null; }
    if (dir) {
      const nx = Math.max(60, hero.x + dir * WALK * dt);
      if (nx === hero.x) hero.tx = null; else walking = true;
      hero.x = nx; hero.face = dir;
    }
    spawns.forEach(s => { if (!s.done && hero.x >= s.x) { s.done = true; spawnNib(s.behind); } });
    if (stopIdx < stops.length && hero.x >= stops[stopIdx]) { hero.x = stops[stopIdx]; hero.face = 1; hero.tx = null; walking = false; askQuestion('journey'); }
    else if (stopIdx >= stops.length && hero.x >= siteCam + PSX) {
      hero.x = siteCam + PSX; hero.face = 1; hero.tx = null; walking = false; phase = 'arrive';
      nibs.forEach(n => { if (n.state !== 'fly') { n.state = 'leave'; n.dir = n.x < hero.x ? -1 : 1; n.speed = 90; } });
      talk(['arrive']); hero.happyT = 1.4;
      later(2.6, nextBuild);
    }
  }
  camX = clamp(hero.x - PSX, 0, siteCam);
  if (walking || phase !== 'walk') lastMoveT = now;
  $('rightBtn').classList.toggle('nudge', S.move === 'manual' && phase === 'walk' && !blocked && now - lastMoveT > 5); // gentle reminder to walk on
  if (phase === 'ask' && DIFF[S.diff].askSpawn && now > nextAskSpawn) { nextAskSpawn = now + DIFF[S.diff].askSpawn; spawnNib(true); }
  hero.legAmp += ((walking ? 0.5 : 0) - hero.legAmp) * Math.min(1, dt * 12);
  hero.walkPh += dt * 11 * (walking ? 1 : 0);
  if (walking && hero.onGround) { stepT -= dt; if (stepT <= 0) { SFX.step(); stepT = S.char === 'henry' ? 0.32 : 0.24; } }
  if (!hero.onGround) {
    hero.vy += 1500 * dt; hero.y += hero.vy * dt;
    if (hero.y >= GY) { hero.y = GY; hero.vy = 0; hero.onGround = true; hero.squash = 0.22; SFX.land(); burst(heroSX(), GY, 8, [rgb(TH.dirt, 1.2), rgb(TH.top)], [60, 160], [3, 6], 0.4, 500, 80); }
  }
  hero.squash *= Math.pow(0.0005, dt);
  if (hero.actT > 0) { hero.actT -= dt; if (!hero.acted && hero.actT < 0.5) { hero.acted = true; actionBlast(); } }
  hero.happyT = Math.max(0, hero.happyT - dt); hero.wrongT = Math.max(0, hero.wrongT - dt);
  if (hero.happyT > 1.0 && hero.onGround && hero.happyT < 1.55 && !hero._hop && !hero.dance) { hero._hop = true; hero.vy = -330; hero.onGround = false; }
  if (hero.happyT <= 0) hero._hop = false;
  if (hero.dance) hero.y = GY - Math.abs(Math.sin(now * Math.PI * 4)) * 14;

  updateNibs(dt);
  const nowBlocked = nibs.some(activeNib);
  $('actBtn').classList.toggle('urge', nowBlocked);
  if (nowBlocked) { if (blockedSince < 0) blockedSince = now; if (now - blockedSince > 11 && !talking()) { blockedSince = now; talk(['nib_' + S.char]); } } else blockedSince = -1;

  items.forEach(it => { it.wob = Math.max(0, (it.wob || 0) - dt * 2); });
  items = items.filter(it => !((it.state === 'poof' && now - it.t0 > 0.4) || it.state === 'got'));
  flyers.forEach(f => { if (now - f.t0 >= f.dur && !f.fin) { f.fin = true; f.done && f.done(); } });
  flyers = flyers.filter(f => !f.fin);

  // gentle help after a quiet spell
  if (playing && (phase === 'ask' || phase === 'bask' || phase === 'place') && now - lastProgress > 9 && !talking() && !nowBlocked) {
    lastProgress = now; talk(promptParts(), round && round.type === 'count' && phase !== 'place' ? { cap: `Collect ${NUMWORD[round.n]} gems!` } : {});
    if (phase === 'place') hint = 'outline';
    else if (round && round.type === 'count') hint = items.find(i => i.state === 'idle') || null;
    else if (round) hint = items.find(i => i.val === round.target) || null;
  }
  // chimney smoke and other ambient bits
  if (LV) {
    LV.pieces.forEach((p, i) => {
      if (p.smoke && status[i] === 'built' && now - smokeT > 0.5) { smokeT = now; const b = p.blocks[p.blocks.length - 1]; puff(siteX() - camX + b.c * BS, GY - (b.r + 1) * BS - 4, rand(-8, 8), -30, 6, 'rgba(235,235,240,.9)', 2.2, 2.4); }
    });
  }
  parts.forEach(p => { p.age += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; if (p.kind === 'cloud') { p.vx *= Math.pow(0.15, dt); } });
  parts = parts.filter(p => p.age < p.life);
  pops.forEach(p => { p.age += dt; }); pops = pops.filter(p => p.age < p.life);
  shake *= Math.pow(0.002, dt);
  if (hero.dance && Math.random() < dt * 3) burst(rand(40, W - 40), -10, 6, ['#ff6b6b', '#ffd43b', '#69db7c', '#4dabf7', '#f783ac'], [20, 80], [4, 7], 2.4, 160);
  flakes.forEach(f => { f.y += f.v * dt / H; f.x += Math.sin(now + f.s * 3) * 0.01 * dt; if (f.y > 1) { f.y = 0; f.x = Math.random(); } });
}
