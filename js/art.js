// Pixel textures, outpost blocks and the two heroes (Bob and Mr Henry) plus the Nibblers.
'use strict';

// ------------------------------------------------------------------ textures
const GREEN = [96, 200, 62], HC = [134, 166, 206];
const T = {
  head: tex(66, 58, GREEN, 4, 16, 13), body: tex(46, 40, [78, 176, 52], 4, 14, 32), arm: tex(14, 40, [86, 186, 56], 4, 12, 21),
  leg: tex(18, 26, [60, 142, 46], 4, 12, 22), nib: tex(46, 38, [178, 146, 228], 4, 14, 41),
  hbody: tex(96, 60, HC, 4, 12, 81), hhead: tex(46, 52, [140, 172, 212], 4, 12, 82), hleg: tex(16, 36, [118, 150, 190], 4, 10, 83), hear: tex(30, 46, [126, 158, 198], 4, 10, 84),
  trunk: tex(20, 120, [120, 84, 52], 6, 14, 65), palm: tex(14, 14, [160, 120, 70], 4, 12, 66),
};
const BT = {
  stone: tex(22, 22, [150, 152, 162], 4, 16, 71), plank: tex(22, 22, [196, 146, 86], 4, 12, 72), door: tex(22, 22, [124, 82, 46], 4, 10, 73),
  roof: tex(22, 22, [214, 72, 62], 4, 14, 74), pole: tex(6, 22, [96, 72, 50], 3, 8, 75), flag: tex(22, 22, [90, 200, 70], 4, 12, 76),
  log: tex(22, 22, [132, 92, 56], 4, 10, 77), brick: tex(22, 22, [176, 82, 64], 4, 10, 78), leaf: tex(22, 22, [70, 165, 55], 4, 20, 79),
  rock: tex(22, 22, [118, 120, 130], 4, 18, 80), red: tex(22, 22, [222, 64, 64], 4, 10, 85), white: tex(22, 22, [244, 244, 240], 4, 6, 86),
  snow: tex(22, 22, [236, 244, 252], 4, 8, 87), iceroof: tex(22, 22, [120, 170, 226], 4, 12, 88),
  // seasonal
  hroof: tex(22, 22, [112, 70, 164], 4, 14, 89), orange: tex(22, 22, [244, 140, 50], 4, 10, 90), aleaf: tex(22, 22, [222, 120, 44], 4, 20, 91),
  hflag: tex(22, 22, [255, 140, 40], 4, 12, 92), xflag: tex(22, 22, [214, 44, 54], 4, 12, 93),
};
let TH = THEMES.meadow, GT = {};
function themeTextures(th) {
  return { top: tex(64, 64, th.top, 8, 14, 61), lip: tex(64, 16, th.lip, 8, 12, 62), dirt: tex(64, 64, th.dirt, 8, 14, 63), leaf: tex(30, 30, th.leaf, 6, 20, 64) };
}


// ------------------------------------------------------------------ outpost blocks
// A block draws as its seasonal skin if it has one (see skinOutposts), with any seasonal extra on top.
function drawBlock(b, x, y, time) {
  const t = b.skin || b.t;
  if (BLOCK_ART[t]) BLOCK_ART[t](b, x, y, time); else texturedBlock(t, x, y);
  if (b.over) BLOCK_ART[b.over](b, x, y, time);
}
const GRAIN = {
  log: (x, y) => { ctx.fillStyle = 'rgba(60,35,20,.35)'; ctx.fillRect(x + 6, y, 2, BS); ctx.fillRect(x + 14, y, 2, BS); },
  brick: (x, y) => { ctx.fillStyle = 'rgba(240,220,200,.45)'; ctx.fillRect(x, y + 10, BS, 2); ctx.fillRect(x + 10, y, 2, 10); ctx.fillRect(x + 4, y + 12, 2, 10); },
  snow: (x, y) => { ctx.fillStyle = 'rgba(160,190,230,.35)'; ctx.fillRect(x, y + BS - 4, BS, 4); },
};
function texturedBlock(t, x, y) {
  ctx.drawImage(BT[t] || BT.stone, x, y, BS, BS);
  if (GRAIN[t]) GRAIN[t](x, y);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x, y, BS, 3); ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(x, y + BS - 3, BS, 3);
}
function wavingFlag(img, b, x, y, time) { const wav = Math.sin(time * 6 + b.c) * 2; ctx.drawImage(img, x, y + wav, BS, BS); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x, y + wav, BS, 3); }
function windowFrame(x, y, glass, bars = true) {
  ctx.fillStyle = '#5b3d22'; ctx.fillRect(x, y, BS, BS); ctx.fillStyle = glass; ctx.fillRect(x + 3, y + 3, BS - 6, BS - 6);
  if (bars) { ctx.fillStyle = '#5b3d22'; ctx.fillRect(x + 10, y + 3, 2, BS - 6); ctx.fillRect(x + 3, y + 10, BS - 6, 2); }
}
const BLOCK_ART = {
  pole: (b, x, y) => ctx.drawImage(BT.pole, x + 8, y, 6, BS),
  flag: (b, x, y, time) => wavingFlag(BT.flag, b, x, y, time),
  window: (b, x, y) => windowFrame(x, y, '#a8dcff'),
  doortop: (b, x, y) => { ctx.drawImage(BT.door, x, y, BS, BS); ctx.fillStyle = '#5b3d22'; ctx.fillRect(x, y, BS, 3); },
  door: (b, x, y) => { ctx.drawImage(BT.door, x, y, BS, BS); ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 15, y + 6, 4, 4); },
  ladder: (b, x, y) => { ctx.fillStyle = '#8a5a30'; ctx.fillRect(x + 2, y, 4, BS); ctx.fillRect(x + 16, y, 4, BS); ctx.fillStyle = '#b07a44'; ctx.fillRect(x + 2, y + 5, 18, 3); ctx.fillRect(x + 2, y + 15, 18, 3); },
  glass: (b, x, y, time) => { const f = 0.8 + 0.2 * Math.sin(time * 6 + b.c); ctx.fillStyle = '#5b3d22'; ctx.fillRect(x, y, BS, BS); ctx.fillStyle = `rgba(255,${210 + 30 * f | 0},90,1)`; ctx.fillRect(x + 3, y + 3, BS - 6, BS - 6); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x + 4, y + 4, 4, 8); },
};

// ------------------------------------------------------------------ seasonal blocks (Halloween, Christmas)
const glowAt = (time, c) => 0.75 + 0.25 * Math.sin(time * 5 + c * 2);
const WEB = [0, 0.52, 1.05, 1.57];
const BULBS = ['#ff5a5a', '#ffd23f', '#5ad46a', '#5ab4ff'];
function snowCap(x, y) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 2, BS + 2, 6); ctx.fillRect(x + 4, y + 4, 3, 3); ctx.fillRect(x + 14, y + 4, 4, 2); }
Object.assign(BLOCK_ART, {
  hflag: (b, x, y, time) => wavingFlag(BT.hflag, b, x, y, time),
  xflag: (b, x, y, time) => wavingFlag(BT.xflag, b, x, y, time),
  pumpkin: (b, x, y, time) => { // a smiling pumpkin lantern
    ctx.fillStyle = '#4a9a34'; ctx.fillRect(x + 9, y, 4, 4);
    ctx.fillStyle = '#e8772e'; ctx.fillRect(x + 3, y + 3, BS - 6, BS - 3); ctx.fillRect(x, y + 6, BS, BS - 9);
    ctx.fillStyle = '#c85a1e'; ctx.fillRect(x + 6, y + 4, 2, BS - 5); ctx.fillRect(x + 14, y + 4, 2, BS - 5);
    ctx.fillStyle = `rgba(255,220,90,${glowAt(time, b.c)})`; ctx.fillRect(x + 4, y + 9, 4, 4); ctx.fillRect(x + 14, y + 9, 4, 4);
    ctx.fillRect(x + 6, y + 16, 10, 2); ctx.fillRect(x + 4, y + 14, 2, 2); ctx.fillRect(x + 16, y + 14, 2, 2);
  },
  jackwin: (b, x, y, time) => { // a warm window with a little pumpkin on the sill
    windowFrame(x, y, `rgba(255,${170 + 40 * glowAt(time, b.c) | 0},70,1)`);
    ctx.fillStyle = '#e8772e'; ctx.fillRect(x + 6, y + 13, 10, 7); ctx.fillStyle = '#4a9a34'; ctx.fillRect(x + 10, y + 11, 2, 2);
    ctx.fillStyle = '#5b3d22'; ctx.fillRect(x + 8, y + 15, 2, 2); ctx.fillRect(x + 12, y + 15, 2, 2);
  },
  ghostwin: (b, x, y, time) => { // a friendly ghost waving from the lighthouse window
    windowFrame(x, y, '#3a2c6e', false);
    const gy = y + 5 + Math.round(Math.sin(time * 3) * 1.5);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 6, gy, 10, 12); ctx.fillRect(x + 4, gy + 3, 14, 9);
    ctx.fillStyle = '#2b2140'; ctx.fillRect(x + 8, gy + 4, 2, 3); ctx.fillRect(x + 12, gy + 4, 2, 3); ctx.fillRect(x + 10, gy + 8, 2, 2);
  },
  web: (b, x, y) => { // a cobweb in the top corner
    const s = b.c < 0 ? 1 : -1, cx = b.c < 0 ? x : x + BS, pt = (a, r) => [cx + s * Math.cos(a) * r, y + Math.sin(a) * r];
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.beginPath();
    WEB.forEach(a => { ctx.moveTo(cx, y); ctx.lineTo(...pt(a, 17)); });
    [7, 13].forEach(r => { ctx.moveTo(...pt(WEB[0], r)); WEB.forEach(a => ctx.lineTo(...pt(a, r))); });
    ctx.stroke();
  },
  snowy: (b, x, y) => { texturedBlock(b.t, x, y); if (b.open) snowCap(x, y); },
  wreathtop: (b, x, y) => {
    BLOCK_ART.doortop(b, x, y);
    ctx.fillStyle = '#2f9e4a'; ctx.fillRect(x + 5, y + 5, 12, 12); ctx.fillStyle = '#7c522e'; ctx.fillRect(x + 8, y + 8, 6, 6);
    ctx.fillStyle = '#e23b3b'; ctx.fillRect(x + 6, y + 6, 2, 2); ctx.fillRect(x + 14, y + 9, 2, 2); ctx.fillRect(x + 8, y + 15, 6, 3);
  },
  xwindow: (b, x, y) => { windowFrame(x, y, '#ffe08a'); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y + BS - 3, BS + 2, 4); },
  present: (b, x, y) => { // a wrapped present, red on the left and green on the right
    const [box, ribbon] = b.c < 0 ? ['#e23b3b', '#ffd23f'] : ['#3fae5a', '#e23b3b'];
    ctx.fillStyle = box; ctx.fillRect(x + 1, y + 4, BS - 2, BS - 4);
    ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(x + 1, y + BS - 3, BS - 2, 3);
    ctx.fillStyle = ribbon; ctx.fillRect(x + 9, y + 4, 4, BS - 4); ctx.fillRect(x + 1, y + 11, BS - 2, 3); ctx.fillRect(x + 5, y, 5, 4); ctx.fillRect(x + 12, y, 5, 4);
  },
  lights: (b, x, y, time) => { // fairy lights along the top
    ctx.fillStyle = '#2b5e2e'; ctx.fillRect(x, y + 1, BS, 2);
    [3, 10, 17].forEach((dx, k) => { const i = Math.round(b.c * 3) + k; ctx.globalAlpha = Math.sin(time * 3 + i * 1.7) > -0.4 ? 1 : 0.45; ctx.fillStyle = BULBS[(i % 4 + 4) % 4]; ctx.fillRect(x + dx, y + 3, 3, 4); });
    ctx.globalAlpha = 1;
  },
});
function drawPiece(p, cx, cy, s, time) { // centred on (cx, cy)
  const e = p.ext;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  p.blocks.forEach(b => drawBlock(b, (b.c - e.c0) * BS - e.w / 2, (e.r1 - b.r) * BS - e.h / 2, time));
  ctx.restore();
}
function pieceIcon(p) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const saved = ctx; ctx = g;
  const s = Math.min(56 / p.ext.w, 56 / p.ext.h, 1.6);
  drawPiece(p, 32, 32, s, 0);
  ctx = saved;
  return c.toDataURL();
}

// ------------------------------------------------------------------ characters
const hero = { x: PSX, y: 360, vy: 0, onGround: true, walkPh: 0, legAmp: 0, squash: 0, actT: 0, acted: false, happyT: 0, wrongT: 0, dance: false, trumps: 0 };
function drawBob(b, time, o = {}) {
  const sq = b.squash || 0, sy = (o.sy || 1) * (1 - sq), sx = (o.sx || 1) * (1 + sq * 0.7);
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(o.rot || 0); ctx.scale(sx, sy);
  [[-1, o.legL || 0], [1, o.legR || 0]].forEach(([side, a]) => { ctx.save(); ctx.translate(side * 11, -26); ctx.rotate(a); ctx.drawImage(T.leg, -9, 0); ctx.fillStyle = '#2c6624'; ctx.fillRect(-9, 20, 18, 6); ctx.restore(); });
  ctx.fillStyle = rgb([78, 176, 52], 0.68); ctx.beginPath(); ctx.moveTo(23, -66); ctx.lineTo(29, -71); ctx.lineTo(29, -30); ctx.lineTo(23, -26); ctx.fill();
  ctx.drawImage(T.body, -23, -66, 46, 40);
  ctx.save(); ctx.translate(0, -64 + (o.headDy || 0)); ctx.rotate(o.headTilt || 0);
  ctx.fillStyle = rgb(GREEN, 0.68); ctx.beginPath(); ctx.moveTo(33, -58); ctx.lineTo(41, -65); ctx.lineTo(41, -7); ctx.lineTo(33, 0); ctx.fill();
  ctx.fillStyle = rgb(GREEN, 1.18); ctx.beginPath(); ctx.moveTo(-33, -58); ctx.lineTo(-25, -65); ctx.lineTo(41, -65); ctx.lineTo(33, -58); ctx.fill();
  ctx.drawImage(T.head, -33, -58);
  wear('bobHat', time);
  const path = [[0, 0], [0, -6], [0, -12], [6, -12], [6, -18], [6, -24], [0, -24], [0, -30], [0, -36]];
  const amp = o.antAmp == null ? 0.35 : o.antAmp; let tipX = 0;
  path.forEach(([px, py], i) => { const sw = amp * Math.sin(time * 6 - i * 0.5) * (i / path.length) * 6; ctx.fillStyle = rgb(GREEN, i % 2 ? 1.0 : 0.94); ctx.fillRect(px + sw, -64 + py - 3, 6, 6); tipX = 3 + px + sw; });
  ctx.fillStyle = '#82e650'; ctx.fillRect(tipX - 4, -109, 9, 7); ctx.fillStyle = '#aaf878'; ctx.fillRect(tipX - 4, -109, 9, 2);
  drawBobFace(o.face || {});
  ctx.restore();
  [[-1, o.armL == null ? 0.15 : o.armL], [1, o.armR == null ? 0.15 : o.armR]].forEach(([side, a]) => { ctx.save(); ctx.translate(side * 28, -62); ctx.rotate(-side * a); ctx.drawImage(T.arm, -7, -3); ctx.fillStyle = '#4a9a34'; ctx.fillRect(-7, 31, 14, 7); ctx.restore(); });
  ctx.restore();
}
function drawBobFace(f) {
  const fx = -33, fy = -58, ink = '#221a1e', pup = f.pupils || [[0, 0], [0, 0]];
  [[7, 12, 22, 20, 9, 10], [40, 18, 17, 15, 7, 7]].forEach(([x, y, w, h, pw, ph], k) => {
    const X = fx + x, Y = fy + y;
    if ((f.eyes || 'open') === 'open') {
      ctx.fillStyle = '#fafafa'; ctx.fillRect(X, Y, w, h); ctx.fillStyle = '#e1e6eb'; ctx.fillRect(X, Y, w, 2);
      const cx = clamp(X + w / 2 + pup[k][0], X + pw / 2, X + w - pw / 2), cy = clamp(Y + h / 2 + 1 + pup[k][1], Y + ph / 2, Y + h - ph / 2);
      ctx.fillStyle = ink; ctx.fillRect(cx - pw / 2, cy - ph / 2, pw, ph); ctx.fillStyle = '#fff'; ctx.fillRect(cx - pw / 2 + 1, cy - ph / 2 + 1, 2, 2);
    } else if (f.eyes === 'closed') { ctx.fillStyle = ink; ctx.fillRect(X, Y + h / 2 + 1, w, 3); }
    else { ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.beginPath(); const ym = Y + h / 2;
      if (k === 0) { ctx.moveTo(X + 2, ym - 6); ctx.lineTo(X + w - 2, ym); ctx.lineTo(X + 2, ym + 6); } else { ctx.moveTo(X + w - 2, ym - 5); ctx.lineTo(X + 2, ym); ctx.lineTo(X + w - 2, ym + 5); }
      ctx.stroke(); }
  });
  ctx.fillStyle = 'rgba(240,130,150,.8)'; ctx.fillRect(fx + 4, fy + 36, 8, 4); ctx.fillRect(fx + 54, fy + 36, 8, 4);
  const mx = fx + 34, my = fy + 46, m = f.mouth || 'smile';
  ctx.fillStyle = ink;
  if (m === 'smile') { [[-18, -4], [-14, 0], [14, 0], [18, -4]].forEach(([x, y]) => ctx.fillRect(mx + x - 2, my + y, 4, 4)); ctx.fillRect(mx - 10, my + 4, 20, 4); }
  else if (m === 'grin' || m === 'open') { const w = m === 'grin' ? 16 : 13, d = m === 'open' ? 12 : 9;
    ctx.fillRect(mx - w, my - 4, w * 2, 4); ctx.fillRect(mx - w + 3, my, w * 2 - 6, d); ctx.fillStyle = '#ec6278'; ctx.fillRect(mx - w + 7, my + d - 4, w * 2 - 14, 4);
    if (m === 'grin') { ctx.fillStyle = '#fafafa'; ctx.fillRect(mx - w + 4, my, w * 2 - 8, 2); } }
  else if (m === 'O') { const r = f.mouthR || 5; ctx.fillRect(mx - r, my - 2, r * 2, r * 2); }
}
// Mr Henry: a blocky elephant drawn side-on, facing the way he walks (right)
function drawHenry(b, time, o = {}) {
  const sq = b.squash || 0, sy = (o.sy || 1) * (1 - sq), sx = (o.sx || 1) * (1 + sq * 0.7);
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(o.rot || 0); ctx.scale(sx, sy);
  // tail with tuft
  const tu = o.tailUp || 0;
  ctx.save(); ctx.translate(-50, -82); ctx.rotate(0.55 + tu * 1.5 + Math.sin(time * 3) * 0.08);
  ctx.fillStyle = rgb(HC, 0.8); ctx.fillRect(-2, 0, 5, 24);
  ctx.fillStyle = '#56607e'; ctx.fillRect(-5, 22, 11, 8); ctx.fillRect(-5, 29, 3, 6); ctx.fillRect(0, 29, 3, 7); ctx.fillRect(4, 29, 2, 5);
  ctx.restore();
  const sw = o.legSw || 0;
  const legs = [[-40, 1], [14, 1], [-24, 0], [30, 0]];
  const leg = (lx, far, i) => {
    const a = sw * ((i === 0 || i === 3) ? 1 : -1);
    ctx.save(); ctx.translate(lx, -36); ctx.rotate(a);
    ctx.drawImage(T.hleg, -8, 0, 16, 36);
    if (far) { ctx.fillStyle = 'rgba(30,40,80,.25)'; ctx.fillRect(-8, 0, 16, 36); }
    ctx.fillStyle = '#f5f1e6'; ctx.fillRect(-6, 31, 4, 5); ctx.fillRect(-1, 31, 4, 5); ctx.fillRect(4, 31, 3, 5);
    ctx.restore();
  };
  legs.forEach(([lx, far], i) => { if (far) leg(lx, far, i); });
  ctx.fillStyle = rgb(HC, 1.15); ctx.beginPath(); ctx.moveTo(-52, -92); ctx.lineTo(-46, -98); ctx.lineTo(50, -98); ctx.lineTo(44, -92); ctx.fill();
  ctx.drawImage(T.hbody, -52, -92, 96, 60);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-52, -92, 96, 4);
  ctx.fillStyle = 'rgba(20,30,60,.15)'; ctx.fillRect(-52, -38, 96, 6);
  legs.forEach(([lx, far], i) => { if (!far) leg(lx, far, i); });
  wear('henryBack', time);
  // head
  ctx.save(); ctx.translate(0, o.headDy || 0); ctx.translate(48, -90); ctx.rotate(o.headTilt || 0); ctx.translate(-48, 90);
  ctx.fillStyle = rgb(HC, 1.2); ctx.beginPath(); ctx.moveTo(26, -116); ctx.lineTo(32, -122); ctx.lineTo(78, -122); ctx.lineTo(72, -116); ctx.fill();
  ctx.fillStyle = rgb(HC, 0.75); ctx.beginPath(); ctx.moveTo(72, -116); ctx.lineTo(78, -122); ctx.lineTo(78, -70); ctx.lineTo(72, -64); ctx.fill();
  ctx.drawImage(T.hhead, 26, -116, 46, 52);
  // face
  const f = o.face || {}, ink = '#221a1e';
  const ex = 52, ey = -106;
  if ((f.eyes || 'open') === 'open') {
    ctx.fillStyle = '#fafafa'; ctx.fillRect(ex, ey, 13, 13);
    const p = f.pupil || [0, 0];
    const px = clamp(ex + 6.5 + p[0], ex + 3, ex + 10), py = clamp(ey + 7 + p[1], ey + 3.5, ey + 9.5);
    ctx.fillStyle = ink; ctx.fillRect(px - 3, py - 3.5, 6, 7); ctx.fillStyle = '#fff'; ctx.fillRect(px - 2, py - 2.5, 2, 2);
  } else if (f.eyes === 'closed') { ctx.fillStyle = ink; ctx.fillRect(ex, ey + 7, 13, 3); }
  else { ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ex + 1, ey + 1); ctx.lineTo(ex + 12, ey + 6); ctx.lineTo(ex + 1, ey + 11); ctx.stroke(); }
  ctx.fillStyle = 'rgba(240,130,150,.8)'; ctx.fillRect(ex + 10, ey + 18, 7, 4);
  const m = f.mouth || 'smile';
  ctx.fillStyle = ink;
  if (m === 'smile') { ctx.fillRect(47, -84, 3, 3); ctx.fillRect(50, -81, 10, 3); ctx.fillRect(60, -84, 3, 3); }
  else if (m === 'grin' || m === 'open') { ctx.fillRect(46, -86, 18, 3); ctx.fillRect(48, -83, 14, m === 'open' ? 8 : 6); ctx.fillStyle = '#ec6278'; ctx.fillRect(51, m === 'open' ? -78 : -80, 8, 3); }
  else if (m === 'O') { const r = f.mouthR || 4; ctx.fillRect(55 - r, -84, r * 2, r * 2); }
  else if (m === 'puff') { ctx.fillRect(49, -82, 12, 3); ctx.fillStyle = 'rgba(240,130,150,.9)'; ctx.fillRect(ex + 8, ey + 16, 10, 7); }
  // trunk
  const up = o.trunkUp || 0;
  let tx = 70, ty = -72;
  for (let i = 0; i < 6; i++) {
    const hang = Math.PI / 2 + 0.04 + (i >= 4 ? -(i - 3) * 0.55 : 0);
    const raised = -0.45 - i * 0.28;
    const ang = lerp(hang, raised, up) + Math.sin(time * 2.4 - i * 0.6) * 0.07;
    const sz = 13 - i * 0.6;
    ctx.fillStyle = rgb(HC, i % 2 ? 0.98 : 0.9); ctx.fillRect(tx - sz / 2, ty - sz / 2, sz, sz);
    if (i === 5) { ctx.fillStyle = rgb(HC, 0.7); ctx.fillRect(tx - sz / 2, ty - sz / 2, sz, 3); }
    tx += Math.cos(ang) * 9; ty += Math.sin(ang) * 9;
  }
  // big ear (drawn last so it sits over the head like the drawing)
  ctx.save(); ctx.translate(30, -112); ctx.rotate(Math.sin(time * 3) * 0.05 + (o.earFlap || 0));
  ctx.drawImage(T.hear, -16, 0, 30, 46); ctx.fillStyle = '#eba7bb'; ctx.fillRect(-11, 6, 20, 30); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(-16, 40, 30, 6);
  ctx.restore();
  wear('henryHead', time);
  ctx.restore();
  ctx.restore();
}
function drawNib(n, x, y, time) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(n.rot || 0);
  const k = n.state === 'pop' ? easeOutBack(n.t / 0.45) : 1;
  ctx.scale(1, Math.max(0.05, k));
  if (n.dir > 0) ctx.scale(-1, 1);
  const hop = n.state === 'gloat' ? Math.abs(Math.sin(n.t * 10)) * 16 : n.state === 'walk' || n.state === 'leave' || n.state === 'flee' ? Math.abs(Math.sin(n.ph)) * 6 : n.state === 'nibble' ? Math.abs(Math.sin(n.ph * 1.5)) * 4 : 0;
  ctx.translate(0, -hop);
  if (n.state !== 'fly') { ctx.fillStyle = '#6d4fa8'; ctx.fillRect(-18, -6, 12, 6); ctx.fillRect(6, -6, 12, 6); }
  ctx.fillStyle = rgb([178, 146, 228], 0.7); ctx.beginPath(); ctx.moveTo(23, -42); ctx.lineTo(30, -48); ctx.lineTo(30, -10); ctx.lineTo(23, -4); ctx.fill();
  ctx.fillStyle = rgb([178, 146, 228], 1.15); ctx.beginPath(); ctx.moveTo(-23, -42); ctx.lineTo(-16, -48); ctx.lineTo(30, -48); ctx.lineTo(23, -42); ctx.fill();
  ctx.drawImage(T.nib, -23, -42, 46, 38);
  nibEyes(n);
  if (n.state === 'fly') { ctx.fillRect(-12, -16, 18, 8); ctx.fillStyle = '#ec6278'; ctx.fillRect(-8, -12, 10, 4); }
  else { const open = n.state === 'nibble' && Math.sin(n.ph * 3) > 0; ctx.fillRect(-10, -17, 16, open ? 8 : 3); ctx.fillStyle = '#fff'; ctx.fillRect(-4, -17, 5, 5); }
  wear('nib', n);
  ctx.restore();
}
function nibEyes(n) {
  ctx.fillStyle = '#fff'; ctx.fillRect(-16, -36, 14, 13); ctx.fillRect(4, -33, 10, 10);
  ctx.fillStyle = '#2b2140'; const look = n.state === 'fly' ? 0 : -2; ctx.fillRect(-11 + look, -31, 5, 6); ctx.fillRect(7 + look, -29, 4, 4);
}

// ------------------------------------------------------------------ seasonal costumes
// Small additions over the heroes and Nibblers, so they stay recognisable. Each is drawn in that body part's own coordinates.
const COSTUMES = {
  halloween: { bobHat: witchHat, henryBack: cape, nib: ghostSheet },
  christmas: { bobHat: santaHat, henryHead: scarfAndAntlers, nib: elfHat },
};
function wear(part, arg) { const c = SEASON && COSTUMES[SEASON.id]; if (c && c[part]) c[part](arg); }
function steps(rows, h) { rows.forEach(([x, y, w]) => ctx.fillRect(x, y, w, h)); } // a pixel shape from rows of [x, y, width]
function witchHat() { // Bob: a little purple witch hat; his antenna pokes out in front
  ctx.fillStyle = '#4b2f7a'; ctx.fillRect(-38, -67, 54, 6);
  steps([[-30, -75, 38], [-26, -82, 29], [-22, -89, 20], [-19, -95, 13], [-17, -100, 8], [-21, -104, 6]], 8);
  ctx.fillStyle = '#ff8a1f'; ctx.fillRect(-30, -74, 38, 5); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-14, -74, 5, 5);
}
function santaHat() { // Bob: a Santa hat flopping to one side
  ctx.fillStyle = '#e23b3b'; steps([[-32, -77, 58], [-26, -85, 48], [-18, -92, 38], [-8, -98, 30], [6, -102, 22], [20, -100, 12]], 9);
  ctx.fillRect(26, -92, 8, 10);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(-38, -70, 70, 9); ctx.fillRect(25, -84, 11, 11);
  ctx.fillStyle = '#dde6f0'; ctx.fillRect(-38, -63, 70, 2); ctx.fillRect(25, -75, 11, 2);
}
function cape(time) { // Mr Henry: a little cape, purple with an orange lining, blowing out behind him
  const fl = Math.round(Math.sin(time * 4) * 3);
  const shape = dy => { ctx.beginPath(); ctx.moveTo(24, -102); ctx.lineTo(-10, -110 + fl + dy); ctx.lineTo(-50, -106 + fl + dy); ctx.lineTo(-78, -90 + fl + dy); ctx.lineTo(-56, -86 + dy); ctx.lineTo(-62, -70 + fl + dy); ctx.lineTo(-30, -80 + dy); ctx.lineTo(0, -86 + fl + dy); ctx.lineTo(20, -88); ctx.closePath(); ctx.fill(); };
  ctx.fillStyle = '#ff8a1f'; shape(4);
  ctx.fillStyle = '#5b3a8c'; shape(0);
  ctx.fillStyle = '#ffd23f'; ctx.fillRect(18, -104, 8, 8);
}
function scarfAndAntlers(time) { // Mr Henry: little reindeer antlers and a stripy scarf
  ctx.fillStyle = '#9a6a3a';
  [38, 58].forEach(x => { ctx.fillRect(x, -136, 4, 16); ctx.fillRect(x - 6, -132, 7, 3); ctx.fillRect(x - 6, -138, 3, 7); ctx.fillRect(x + 3, -140, 7, 3); ctx.fillRect(x + 7, -146, 3, 7); });
  const sw = Math.round(Math.sin(time * 3) * 2);
  for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#ffffff' : '#e23b3b'; ctx.fillRect(16 + k * 6, -72, 6, 10); }
  for (let k = 0; k < 3; k++) { ctx.fillStyle = k % 2 ? '#ffffff' : '#e23b3b'; ctx.fillRect(22 + sw, -62 + k * 6, 9, 6); }
  ctx.fillStyle = '#e23b3b'; ctx.fillRect(22 + sw, -44, 2, 4); ctx.fillRect(26 + sw, -44, 2, 4); ctx.fillRect(29 + sw, -44, 2, 4);
}
function ghostSheet(n) { // Nibblers: a little ghost sheet with eye holes
  ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.fillRect(-26, -50, 56, 28); ctx.fillRect(-21, -54, 46, 4);
  for (let k = 0; k < 6; k++) ctx.fillRect(-26 + k * 10, -22, 6, 4);
  nibEyes(n);
}
function elfHat() { // Nibblers: an elf hat with a bell
  ctx.fillStyle = '#3fae5a'; steps([[-20, -58, 42], [-12, -64, 32], [-4, -69, 24], [6, -73, 15], [14, -76, 8]], 6);
  ctx.fillStyle = '#e23b3b'; ctx.fillRect(-24, -53, 52, 6); ctx.fillStyle = '#ffd23f'; ctx.fillRect(21, -78, 6, 6);
}
