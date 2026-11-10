// Main loop and start-up.
'use strict';

// ------------------------------------------------------------------ loop
let last = performance.now();
const SPEED = +(new URLSearchParams(location.search).get('speed')) || 1; // ?speed=2 speeds the game up for testing
// Every frame repaints the whole screen, so draw at most 30 times a second (the animations are slow), on 60 Hz and 120 Hz
// screens alike. The game still steps in sixtieths of a second, as it did when it drew every frame.
const FRAME_MS = 1000 / 30, STEP_MS = 1000 / 60;
const CARDS = [...document.querySelectorAll('.char')].map(b => [b.querySelector('canvas'), b.dataset.char]); // the start screen's hero cards
function menuTick(dt) { now += dt; runTasks(); if (den.on) updateDen(dt); } // the menus' clock, queued tasks and the hero's house run when no game is playing
function tick(dt) { if (!playing) return menuTick(dt); if (!isPaused()) update(dt); }
function frame(t) {
  requestAnimationFrame(frame); // first, so a frame that throws can't stop the game for good
  if (t - last < FRAME_MS - 2) return; // 2 ms of slack, so a 60 Hz screen draws every second frame
  const ms = Math.min(100, t - last), n = Math.max(1, Math.round(ms / STEP_MS)); last = t;
  for (let i = 0; i < n; i++) tick(Math.min(0.05, ms / n / 1000 * SPEED));
  if (!$('title').hidden) CARDS.forEach(([canvas, who]) => renderCard(canvas, who, t / 1000));
  draw(playing ? now : t / 1000);
}
addEventListener('resize', resize);
buildSettingsUI(); fillSettingsUI(); syncModeButtons(); applySeason();
$('musicBtn').setAttribute('aria-pressed', S.music ? 'true' : 'false');
resize();
const boot = () => requestAnimationFrame(frame);
if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('700 30px Andika'), document.fonts.load('700 30px "Silkscreen"')]).catch(() => {}).finally(boot);
else boot();
