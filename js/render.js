// Drawing the world, items, effects and the menu previews.
'use strict';

// ------------------------------------------------------------------ draw: world
function drawSky(time) {
  const g = ctx.createLinearGradient(0, 0, 0, GY);
  g.addColorStop(0, TH.sky[0]); g.addColorStop(0.55, TH.sky[1]); g.addColorStop(1, TH.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, GY + 2);
  const sx = W * 0.7 - camX * 0.03, sy = GY - 230;
  ctx.fillStyle = 'rgba(255,245,190,.35)'; ctx.fillRect(sx - 60, sy - 60, 120, 120); ctx.fillStyle = '#fff4bf'; ctx.fillRect(sx - 40, sy - 40, 80, 80);
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  [[40, 70, 1, 10], [W * 0.5, 130, 0.8, 7], [W * 0.25, 210, 0.6, 5], [W * 0.8, 40, 0.9, 12]].forEach(([x0, y, s, v]) => {
    const x = ((((x0 + v * time - camX * 0.12) % (W + 240)) + W + 240) % (W + 240)) - 200;
    ctx.fillRect(x, y + 14 * s, 140 * s, 36 * s); ctx.fillRect(x + 26 * s, y, 74 * s, 22 * s); ctx.fillRect(x + 96 * s, y + 6 * s, 76 * s, 34 * s);
  });
  // two hill layers with parallax
  [[0.2, 44, TH.far, GY - 120, 1], [0.42, 52, TH.near, GY - 70, 2]].forEach(([par, step, col, base, layer]) => {
    const off = camX * par, i0 = Math.floor(off / step) - 1, i1 = i0 + Math.ceil(W / step) + 3;
    for (let i = i0; i < i1; i++) {
      let h = base - 40 - 40 * (0.5 + 0.5 * Math.sin(i * 0.33 + layer)) - 26 * hash(i, layer);
      if (TH.sea && layer === 1) h = GY - 70 - 8 * hash(i, 5);
      h = Math.round(h / 8) * 8;
      const x = i * step - off;
      ctx.fillStyle = rgb(col); ctx.fillRect(x, h, step + 1, GY - h + 2);
      ctx.fillStyle = rgb(col, TH.sea && layer === 1 ? 1.25 : 1.12); ctx.fillRect(x, h, step + 1, TH.sea && layer === 1 ? 3 : 6);
      if (TH.snow && layer === 2) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, h, step + 1, 8); }
    }
  });
}
function drawGround() {
  const off = ((camX % 64) + 64) % 64;
  for (let x = -off - 64; x < W + 64; x += 64) ctx.drawImage(GT.top, x, GY - 22, 64, 56);
  ctx.fillStyle = rgb(TH.lip, 0.85, 0.6); ctx.fillRect(0, GY + 32, W, 3);
  for (let x = -off - 64; x < W + 64; x += 64) { ctx.drawImage(GT.lip, x, GY + 34, 64, 16); for (let y = GY + 50; y < H; y += 64) ctx.drawImage(GT.dirt, x, y, 64, 64); }
}
function drawDeco(d, time) {
  const x = d.x - camX, s = d.s;
  if (x < -140 || x > W + 140) return;
  ctx.save(); ctx.translate(x, GY - 6); ctx.scale(s, s);
  const leaf = GT.leaf;
  if (d.kind === 'oak') {
    ctx.drawImage(T.trunk, -10, -110, 20, 110);
    [[-45, -170], [-15, -170], [15, -170], [-30, -200], [0, -200], [-60, -140], [-30, -140], [0, -140], [30, -140]].forEach(([a, b]) => { ctx.drawImage(leaf, a, b, 30, 30); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(a, b, 30, 4); });
  } else if (d.kind === 'pine' || d.kind === 'snowpine') {
    ctx.drawImage(T.trunk, -7, -40, 14, 40);
    [5, 4, 3, 2, 1].forEach((n, k) => { for (let j = 0; j < n; j++) { const bx = -n * 11 + j * 22, by = -62 - k * 22; ctx.drawImage(leaf, 0, 0, 22, 22, bx, by, 22, 22); if (d.kind === 'snowpine') { ctx.fillStyle = '#ffffff'; ctx.fillRect(bx, by, 22, 6); } } });
  } else if (d.kind === 'palm') {
    for (let k = 0; k < 9; k++) ctx.drawImage(T.palm, -7 + Math.sin(k * 0.35) * 10, -14 - k * 13, 14, 14);
    const tx = Math.sin(8 * 0.35) * 10, ty = -126;
    for (let k = 0; k < 6; k++) { ctx.save(); ctx.translate(tx, ty); ctx.rotate(-Math.PI + k * Math.PI / 5 + Math.sin(time * 1.5 + k) * 0.05); ctx.drawImage(leaf, 0, 0, 30, 12, 0, -6, 52, 12); ctx.restore(); }
    ctx.fillStyle = '#7a5230'; ctx.fillRect(tx - 6, ty + 2, 8, 8); ctx.fillRect(tx + 3, ty + 4, 8, 8);
  } else if (d.kind === 'flower') {
    const c = ['#ff6b8a', '#ffd23f', '#a78bfa', '#ffffff'][Math.floor(d.seed * 4)];
    ctx.fillStyle = '#4a9a34'; ctx.fillRect(-1, -14, 3, 14); ctx.fillStyle = c; ctx.fillRect(-5, -20, 10, 8); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-2, -18, 4, 4);
  } else if (d.kind === 'mushroom') {
    ctx.fillStyle = '#f2ead8'; ctx.fillRect(-3, -10, 7, 10); ctx.fillStyle = '#e04848'; ctx.fillRect(-9, -18, 18, 9); ctx.fillStyle = '#fff'; ctx.fillRect(-5, -16, 3, 3); ctx.fillRect(3, -15, 3, 3);
  } else if (d.kind === 'rock') {
    ctx.fillStyle = '#9a9cab'; ctx.fillRect(-12, -12, 24, 12); ctx.fillStyle = '#b8bac6'; ctx.fillRect(-8, -16, 14, 6);
  } else if (d.kind === 'shell') {
    ctx.fillStyle = '#ffb3c6'; ctx.fillRect(-7, -8, 14, 8); ctx.fillStyle = '#ff8fab'; ctx.fillRect(-5, -10, 3, 10); ctx.fillRect(0, -10, 3, 10);
  } else if (d.kind === 'snowman') {
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-12, -24, 24, 24); ctx.fillRect(-9, -42, 18, 18); ctx.fillStyle = '#2b2140'; ctx.fillRect(-5, -36, 3, 3); ctx.fillRect(3, -36, 3, 3); ctx.fillStyle = '#ff8a3d'; ctx.fillRect(0, -32, 8, 3);
  }
  ctx.restore();
}
function drawStop(i, time) {
  const x = stops[i] + 140 - camX; if (x < -60 || x > W + 60) return;
  const done = i < stopIdx;
  ctx.fillStyle = '#7a5230'; ctx.fillRect(x - 3, GY - 58, 6, 58);
  ctx.fillStyle = done ? '#7fd36a' : '#ffd23f'; ctx.fillRect(x - 18, GY - 76, 36, 28);
  ctx.strokeStyle = '#2b2140'; ctx.lineWidth = 3; ctx.strokeRect(x - 18, GY - 76, 36, 28);
  ctx.fillStyle = '#2b2140'; ctx.font = '700 20px "Silkscreen", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (done) { ctx.fillRect(x - 9, GY - 63, 4, 4); ctx.fillRect(x - 5, GY - 59, 4, 4); ctx.fillRect(x - 1, GY - 63, 4, 4); ctx.fillRect(x + 3, GY - 67, 4, 4); ctx.fillRect(x + 7, GY - 71, 4, 4); }
  else ctx.fillText('?', x, GY - 61 + Math.sin(time * 4) * 1.5);
}
function drawSite(time) {
  const sx = siteX() - camX;
  if (sx < -300 || sx > W + 300) return;
  // ghost of the whole outpost so children can see the goal
  LV.pieces.forEach((p, i) => {
    if (status[i] === 'built') return;
    ctx.fillStyle = status[i] === 'gone' ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.2)';
    p.blocks.forEach(b => ctx.fillRect(sx + b.c * BS - BS / 2 + 1, GY - (b.r + 1) * BS + 1, BS - 2, BS - 2));
  });
  LV.pieces.forEach((p, i) => {
    if (status[i] !== 'built') return;
    p.blocks.forEach((b, k) => {
      const local = time - builtAt[i] - k * 0.04; if (local < 0) return;
      const fall = 1 - easeOutBack(local / 0.35);
      if (!b._played && local > 0.3 && k % 3 === 0) { b._played = true; SFX.build(); }
      drawBlock(b, sx + b.c * BS - BS / 2, GY - (b.r + 1) * BS - fall * 120, time);
    });
    if (p.beam) { // lighthouse beam
      const b = p.blocks[1], bx = sx + b.c * BS, by = GY - (b.r + 1) * BS + BS / 2, a = Math.sin(time * 1.2) * 0.6;
      ctx.save(); ctx.translate(bx, by); ctx.rotate(a); ctx.fillStyle = 'rgba(255,240,150,.28)';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(260, -40); ctx.lineTo(260, 40); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-260, -40); ctx.lineTo(-260, 40); ctx.fill(); ctx.restore();
    }
  });
  if (phase === 'place' && carry) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 5), p = LV.pieces[carry.piece];
    p.blocks.forEach(b => {
      const x = sx + b.c * BS - BS / 2, y = GY - (b.r + 1) * BS;
      ctx.fillStyle = `rgba(255,255,200,${0.3 + 0.35 * pulse})`; ctx.fillRect(x, y, BS, BS);
      ctx.setLineDash([4, 3]); ctx.lineWidth = 2; ctx.strokeStyle = `rgba(255,255,255,${0.7 + 0.3 * pulse})`; ctx.strokeRect(x + 1, y + 1, BS - 2, BS - 2); ctx.setLineDash([]);
    });
    const bx = pieceBoxScreen(carry.piece);
    ctx.lineWidth = 4; ctx.strokeStyle = `rgba(255,210,63,${0.4 + 0.5 * pulse})`;
    ctx.strokeRect(bx.x0 - 8 - pulse * 3, bx.y0 - 8 - pulse * 3, bx.x1 - bx.x0 + 16 + pulse * 6, bx.y1 - bx.y0 + 16 + pulse * 6);
  }
  if (status.every(s => s === 'built' || s === 'gone') && builtAt.some(t => t >= 0) && phase === 'done') {
    const k = clamp((time - Math.max(...builtAt)) / 1.4, 0, 1), cols = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'];
    ctx.save(); ctx.globalAlpha = 0.6 * k;
    cols.forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(sx, GY, LV.ext.h + 40 - i * 10, Math.PI, Math.PI + Math.PI * k); ctx.stroke(); });
    ctx.restore();
  }
}
function drawShadow(x, h, w = 44) { const k = 1 - clamp(h / 400, 0, 0.7); ctx.fillStyle = `rgba(30,50,20,${0.25 * k})`; ctx.fillRect(x - w * k, GY - 4, w * 2 * k, 8); }
function drawCube(x, y, c, label, s = 1, glow = 0) {
  const S = 64;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (glow) { ctx.fillStyle = `rgba(255,230,120,${0.35 * glow})`; ctx.fillRect(-S / 2 - 12, -S - 20, S + 30, S + 30); }
  ctx.fillStyle = rgb(c, 0.7); ctx.beginPath(); ctx.moveTo(S / 2, -S); ctx.lineTo(S / 2 + 9, -S - 8); ctx.lineTo(S / 2 + 9, -8); ctx.lineTo(S / 2, 0); ctx.fill();
  ctx.fillStyle = rgb(c, 1.15); ctx.beginPath(); ctx.moveTo(-S / 2, -S); ctx.lineTo(-S / 2 + 9, -S - 8); ctx.lineTo(S / 2 + 9, -S - 8); ctx.lineTo(S / 2, -S); ctx.fill();
  ctx.fillStyle = rgb(c); ctx.fillRect(-S / 2, -S, S, S);
  ctx.fillStyle = '#fff8e6'; ctx.fillRect(-S / 2 + 6, -S + 6, S - 12, S - 12);
  ctx.strokeStyle = '#2b2140'; ctx.lineWidth = 3; ctx.strokeRect(-S / 2, -S, S, S);
  ctx.fillStyle = '#2b2140'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (label.kind === 'grapheme') {
    const sh = showG(label.val);
    if (sh.length > 1) { ctx.font = '700 17px Andika, sans-serif'; ctx.fillText(sh[0], 0, -S + 18); ctx.font = `700 ${sh[1].length > 2 ? 22 : 27}px Andika, sans-serif`; ctx.fillText(sh[1], 0, -S / 2 + 10); }
    else { ctx.font = `700 ${sh[0].length > 2 ? 24 : sh[0].length > 1 ? 30 : 36}px Andika, "Comic Sans MS", sans-serif`; ctx.fillText(sh[0], 0, -S / 2 + 1); }
  } else if (label.kind === 'number') {
    ctx.font = '700 32px Andika, sans-serif'; ctx.fillText(String(label.val), 0, -S / 2 - 8);
    const n = label.val, per = Math.min(5, n), dw = 6, gap = 3, tot = per * dw + (per - 1) * gap;
    ctx.fillStyle = rgb(c, 0.8);
    for (let i = 0; i < n; i++) { const r = Math.floor(i / 5), cc = i % 5; ctx.fillRect(-tot / 2 + cc * (dw + gap), -19 + r * (dw + 2) - (n > 5 ? 4 : 0), dw, dw); }
  }
  ctx.restore();
}
function drawItem(it, time) {
  const k = easeOutBack((now - it.born) / 0.35);
  if (k <= 0.01) return;
  const fy = Math.sin(time * 2.2 + it.ph) * 5;
  if (it.kind === 'gem') {
    const y = it.y + fy;
    ctx.save(); ctx.translate(it.x, y); ctx.scale(k, k); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = it.hue; ctx.fillRect(-15, -15, 30, 30); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(-15, -15, 30, 6); ctx.fillRect(-15, -15, 6, 30);
    ctx.strokeStyle = '#2b2140'; ctx.lineWidth = 3; ctx.strokeRect(-15, -15, 30, 30); ctx.restore();
    if (Math.sin(time * 4 + it.ph) > 0.8) { ctx.fillStyle = '#fff'; ctx.fillRect(it.x + 13, y - 22, 3, 9); ctx.fillRect(it.x + 10, y - 19, 9, 3); }
    return;
  }
  let x = it.x, s = k, a = 1;
  if (it.state === 'poof') { const q = clamp((now - it.t0) / 0.4, 0, 1); s = 1 - q; a = 1 - q; }
  if (it.wob) x += Math.sin(time * 40) * 6 * it.wob;
  ctx.save(); ctx.globalAlpha = a;
  if (it.state === 'idle') drawShadow(it.x, GY - it.y, 26 * s);
  drawCube(x, it.y + fy, it.col, it, s);
  ctx.restore();
}
function drawPixelArrow(x, y) {
  ctx.fillStyle = '#ff4d8d'; ctx.strokeStyle = '#2b2140'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - 8, y - 30); ctx.lineTo(x + 8, y - 30); ctx.lineTo(x + 8, y - 14); ctx.lineTo(x + 18, y - 14); ctx.lineTo(x, y); ctx.lineTo(x - 18, y - 14); ctx.lineTo(x - 8, y - 14); ctx.closePath(); ctx.fill(); ctx.stroke();
}
function heroPose(time) {
  const blink = (time * 1000) % 3100 < 120, henry = S.char === 'henry';
  const o = { face: { eyes: 'open', mouth: 'smile' } };
  const sw = Math.sin(hero.walkPh) * hero.legAmp;
  if (henry) { o.legSw = sw * 0.7; o.trunkUp = 0; } else { o.legL = sw; o.legR = -sw; o.armL = 0.15 - sw * 0.6; o.armR = 0.15 + sw * 0.6; }
  if (!hero.onGround && !hero.dance) { o.face.mouth = 'O'; if (henry) { o.trunkUp = 0.6; o.legSw = 0.3; o.earFlap = -0.3; } else { o.armL = o.armR = 1.9; o.legL = 0.3; o.legR = -0.3; o.antAmp = 1.2; } }
  if (hero.happyT > 0) { o.face.mouth = 'grin'; if (henry) { o.trunkUp = 1; o.earFlap = Math.sin(time * 14) * 0.2; } else { o.armL = o.armR = 2.4 + Math.sin(time * 18) * 0.25; o.antAmp = 1.4; } }
  if (hero.wrongT > 0) { o.face.mouth = 'O'; o.face.mouthR = 3; o.headTilt = Math.sin(time * 30) * 0.08; }
  if (hero.actT > 0) {
    if (!hero.acted) {
      const k = 1 - (hero.actT - 0.5) / 0.4;
      if (henry) { o.tailUp = k; o.face = { eyes: 'squint', mouth: 'puff' }; o.sx = 1 + 0.05 * k; o.sy = 1 - 0.04 * k; o.legSw = 0.12 * k; }
      else { o.headDy = -6 * k; o.sy = 1 + 0.07 * k; o.face = { eyes: 'squint', mouth: 'O', mouthR: 3 + 4 * k }; o.armL = o.armR = 0.4 + 0.4 * k; }
    } else {
      const k = hero.actT / 0.5;
      if (henry) { o.tailUp = 1; o.face = { eyes: 'squint', mouth: 'grin' }; o.sx = 1 - 0.06 * k; o.rot = -0.05 * k; o.trunkUp = 0.5; }
      else { o.face = { eyes: 'squint', mouth: 'open' }; o.armL = o.armR = 0.9; o.sy = 1 - 0.12 * k; o.sx = 1 + 0.1 * k; }
    }
  }
  const target = phase === 'place' && carry ? [carry.x, carry.y] : (nibs.find(activeNib) ? [nibs.find(activeNib).x - camX, GY - 30] : (items.length && (phase === 'ask' || phase === 'bask') ? [items[0].x, items[0].y - 40] : null));
  if (target && hero.actT <= 0) {
    const dx = clamp((target[0] - heroSX()) / 30, -5, 5), dy = clamp((target[1] - (hero.y - 100)) / 40, -4, 4);
    if (henry) o.face.pupil = [dx * (hero.face || 1), dy]; else o.face.pupils = [[dx, dy], [dx, dy]];
  }
  if (hero.dance) { const p = Math.sin(time * Math.PI * 4); o.face = { eyes: blink ? 'closed' : 'open', mouth: 'grin' }; o.rot = 0.06 * p;
    if (henry) { o.trunkUp = 0.6 + 0.4 * p; o.legSw = 0.3 * p; o.earFlap = 0.25 * p; } else { o.armL = 1.4 + p; o.armR = 1.4 - p; o.legL = 0.35 * Math.max(0, p); o.legR = 0.35 * Math.max(0, -p); o.headTilt = 0.15 * p; o.antAmp = 1.6; } }
  if (blink && o.face.eyes === 'open') o.face.eyes = 'closed';
  return o;
}
function drawHero(time) {
  const b = { x: heroSX(), y: hero.y, squash: hero.squash };
  const f = hero.face || 1;
  drawShadow(b.x + (S.char === 'henry' ? 5 * f : 0), GY - hero.y, S.char === 'henry' ? 64 : 44);
  if (S.char === 'henry') {
    ctx.save(); if (f < 0) { ctx.translate(b.x, 0); ctx.scale(-1, 1); ctx.translate(-b.x, 0); } // Mr Henry turns round to walk back
    drawHenry(b, time, heroPose(time)); ctx.restore();
  } else drawBob(b, time, heroPose(time));
}
function draw(time) {
  ctx.setTransform(SC * DPR, 0, 0, SC * DPR, 0, 0);
  ctx.imageSmoothingEnabled = false;
  if (shake > 0.3) ctx.translate(Math.sin(time * 97) * shake, Math.cos(time * 83) * shake);
  if (!LV) { drawMenuBackdrop(time); return; }
  drawSky(time);
  decos.forEach(d => { if (isTree(d.kind)) drawDeco(d, time); });
  drawGround();
  decos.forEach(d => { if (!isTree(d.kind)) drawDeco(d, time); });
  stops.forEach((_, i) => drawStop(i, time));
  drawSite(time);
  nibs.forEach(n => {
    const x = n.x - camX;
    if (n.state !== 'fly' && n.state !== 'pop') drawShadow(x, 0, 24);
    if (n.state === 'pop') { ctx.fillStyle = rgb(TH.dirt, 0.7); ctx.fillRect(x - 26, GY - 4, 52, 8); }
    drawNib(n, x, n.y, time);
    if (n.carry != null) drawPiece(LV.pieces[n.carry], x, n.y - 72 + Math.sin(time * 10) * 3, 0.42, time);
  });
  drawHero(time);
  items.forEach(it => drawItem(it, time));
  if (carry) {
    const y = carry.y + Math.sin(time * 3) * 6, pulse = 0.5 + 0.5 * Math.sin(time * 5), p = LV.pieces[carry.piece];
    ctx.fillStyle = `rgba(255,236,140,${0.25 + 0.25 * pulse})`; ctx.fillRect(carry.x - p.ext.w * carry.s / 2 - 12, y - p.ext.h * carry.s / 2 - 12, p.ext.w * carry.s + 24, p.ext.h * carry.s + 24);
    drawPiece(p, carry.x, y, carry.s, time);
  }
  flyers.forEach(f => {
    const k = easeInOut((now - f.t0) / f.dur);
    const x = lerp(f.x0, f.x1, k), y = lerp(f.y0, f.y1, k) - Math.sin(k * Math.PI) * f.arc;
    drawPiece(LV.pieces[f.piece], x, y, lerp(f.s0, f.s1, k), time);
  });
  parts.forEach(p => {
    const f = 1 - p.age / p.life;
    if (p.kind === 'cloud') { const s = p.s * (1 + (p.grow - 1) * (p.age / p.life)); ctx.globalAlpha = clamp(f * 1.6, 0, 0.9); ctx.fillStyle = p.c; ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s); ctx.globalAlpha = 1; return; }
    ctx.globalAlpha = clamp(f * 2.5, 0, 1); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); ctx.restore();
  });
  ctx.globalAlpha = 1;
  pops.forEach(p => {
    const k = p.age / p.life, s = easeOutBack(p.age / 0.25);
    ctx.save(); ctx.globalAlpha = 1 - clamp((k - 0.7) / 0.3, 0, 1); ctx.translate(p.x, p.y - k * 40); ctx.scale(s, s);
    ctx.font = `700 ${p.size}px "Silkscreen", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = p.size / 6; ctx.strokeStyle = '#2b2140'; ctx.lineJoin = 'round'; ctx.strokeText(p.text, 0, 0); ctx.fillStyle = p.color; ctx.fillText(p.text, 0, 0);
    ctx.restore();
  });
  if (TH.snow) { ctx.fillStyle = 'rgba(255,255,255,.85)'; flakes.forEach(f => ctx.fillRect(f.x * W, f.y * GY, f.s, f.s)); }
  const bobble = Math.sin(time * 6) * 6;
  if (hint === 'outline' && phase === 'place' && carry) { const bx = pieceBoxScreen(carry.piece); drawPixelArrow(bx.cx, bx.y0 - 14 + bobble); }
  else if (hint && hint.state === 'idle') drawPixelArrow(hint.x, (hint.kind === 'gem' ? hint.y - 30 : hint.y - 86) + bobble);
}
// soft scenery behind the menus
let menuGT = null;
function drawMenuBackdrop(time) {
  TH = THEMES.meadow; if (!menuGT) menuGT = themeTextures(TH); GT = menuGT;
  camX = time * 30;
  drawSky(time); drawGround();
}

// ------------------------------------------------------------------ menu canvases
function renderCard(canvas, who, time) {
  const g = canvas.getContext('2d'); const saved = ctx; ctx = g;
  g.setTransform(2, 0, 0, 2, 0, 0); g.imageSmoothingEnabled = false;
  g.fillStyle = '#bfe3ff'; g.fillRect(0, 0, 170, 150);
  g.fillStyle = '#6ec24a'; g.fillRect(0, 128, 170, 22); g.fillStyle = '#86d65e'; g.fillRect(0, 128, 170, 5);
  const o = { face: { eyes: (time * 1000 + (who === 'henry' ? 900 : 0)) % 3100 < 120 ? 'closed' : 'open', mouth: 'smile' } };
  if (who === 'henry') { o.trunkUp = 0.25 + 0.25 * Math.sin(time * 1.6); o.earFlap = Math.sin(time * 2) * 0.08; drawHenry({ x: 78, y: 136, squash: 0 }, time, o); }
  else { o.armR = 0.4 + 0.35 * Math.sin(time * 5); g.save(); g.translate(85, 136); g.scale(0.74, 0.74); drawBob({ x: 0, y: 0, squash: 0 }, time, o); g.restore(); }
  ctx = saved;
}
function renderPreview(canvas, li, mask) {
  const L = LEVELS[li], th = THEMES[L.theme], g = canvas.getContext('2d'); const saved = ctx; ctx = g;
  g.setTransform(2, 0, 0, 2, 0, 0); g.imageSmoothingEnabled = false;
  const gr = g.createLinearGradient(0, 0, 0, 100); gr.addColorStop(0, th.sky[0]); gr.addColorStop(1, th.sky[2]); g.fillStyle = gr; g.fillRect(0, 0, 160, 120);
  g.fillStyle = rgb(th.near); g.fillRect(0, 84, 160, 16); g.fillStyle = rgb(th.top); g.fillRect(0, 98, 160, 22); g.fillStyle = rgb(th.dirt); g.fillRect(0, 108, 160, 12);
  const e = L.ext, s = Math.min(130 / e.w, 86 / e.h);
  g.save(); g.translate(80, 100); g.scale(s, s);
  L.pieces.forEach((p, i) => p.blocks.forEach(b => {
    const x = b.c * BS - BS / 2, y = -(b.r + 1) * BS;
    if (!mask || mask[i]) drawBlock(b, x, y, 0); else { g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x + 1, y + 1, BS - 2, BS - 2); }
  }));
  g.restore();
  ctx = saved;
}
