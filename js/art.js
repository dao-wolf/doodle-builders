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
};
let TH = THEMES.meadow, GT = {};
function themeTextures(th) {
  return { top: tex(64, 64, th.top, 8, 14, 61), lip: tex(64, 16, th.lip, 8, 12, 62), dirt: tex(64, 64, th.dirt, 8, 14, 63), leaf: tex(30, 30, th.leaf, 6, 20, 64) };
}


// ------------------------------------------------------------------ outpost blocks
function drawBlock(b, x, y, time) {
  const t = b.t;
  if (t === 'pole') { ctx.drawImage(BT.pole, x + 8, y, 6, BS); return; }
  if (t === 'flag') { const wav = Math.sin(time * 6 + b.c) * 2; ctx.drawImage(BT.flag, x, y + wav, BS, BS); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x, y + wav, BS, 3); return; }
  if (t === 'window') { ctx.fillStyle = '#5b3d22'; ctx.fillRect(x, y, BS, BS); ctx.fillStyle = '#a8dcff'; ctx.fillRect(x + 3, y + 3, BS - 6, BS - 6); ctx.fillStyle = '#5b3d22'; ctx.fillRect(x + 10, y + 3, 2, BS - 6); ctx.fillRect(x + 3, y + 10, BS - 6, 2); return; }
  if (t === 'doortop') { ctx.drawImage(BT.door, x, y, BS, BS); ctx.fillStyle = '#5b3d22'; ctx.fillRect(x, y, BS, 3); return; }
  if (t === 'door') { ctx.drawImage(BT.door, x, y, BS, BS); ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 15, y + 6, 4, 4); return; }
  if (t === 'ladder') { ctx.fillStyle = '#8a5a30'; ctx.fillRect(x + 2, y, 4, BS); ctx.fillRect(x + 16, y, 4, BS); ctx.fillStyle = '#b07a44'; ctx.fillRect(x + 2, y + 5, 18, 3); ctx.fillRect(x + 2, y + 15, 18, 3); return; }
  if (t === 'glass') { const f = 0.8 + 0.2 * Math.sin(time * 6 + b.c); ctx.fillStyle = '#5b3d22'; ctx.fillRect(x, y, BS, BS); ctx.fillStyle = `rgba(255,${210 + 30 * f | 0},90,1)`; ctx.fillRect(x + 3, y + 3, BS - 6, BS - 6); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(x + 4, y + 4, 4, 8); return; }
  ctx.drawImage(BT[t] || BT.stone, x, y, BS, BS);
  if (t === 'log') { ctx.fillStyle = 'rgba(60,35,20,.35)'; ctx.fillRect(x + 6, y, 2, BS); ctx.fillRect(x + 14, y, 2, BS); }
  if (t === 'brick') { ctx.fillStyle = 'rgba(240,220,200,.45)'; ctx.fillRect(x, y + 10, BS, 2); ctx.fillRect(x + 10, y, 2, 10); ctx.fillRect(x + 4, y + 12, 2, 10); }
  if (t === 'snow') { ctx.fillStyle = 'rgba(160,190,230,.35)'; ctx.fillRect(x, y + BS - 4, BS, 4); }
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(x, y, BS, 3); ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(x, y + BS - 3, BS, 3);
}
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
  ctx.fillStyle = '#fff'; ctx.fillRect(-16, -36, 14, 13); ctx.fillRect(4, -33, 10, 10);
  ctx.fillStyle = '#2b2140'; const look = n.state === 'fly' ? 0 : -2; ctx.fillRect(-11 + look, -31, 5, 6); ctx.fillRect(7 + look, -29, 4, 4);
  if (n.state === 'fly') { ctx.fillRect(-12, -16, 18, 8); ctx.fillStyle = '#ec6278'; ctx.fillRect(-8, -12, 10, 4); }
  else { const open = n.state === 'nibble' && Math.sin(n.ph * 3) > 0; ctx.fillRect(-10, -17, 16, open ? 8 : 3); ctx.fillStyle = '#fff'; ctx.fillRect(-4, -17, 5, 5); }
  ctx.restore();
}
