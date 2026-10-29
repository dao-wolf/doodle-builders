// Main loop and start-up.
'use strict';

// ------------------------------------------------------------------ loop
let last = performance.now();
const SPEED = +(new URLSearchParams(location.search).get('speed')) || 1; // ?speed=2 speeds the game up for testing
function frame(t) {
  requestAnimationFrame(frame); // first, so a frame that throws can't stop the game for good
  const dt = Math.min(0.05, (t - last) / 1000 * SPEED); last = t;
  if (!$('title').hidden) { renderCard($('cvBob'), 'bob', t / 1000); renderCard($('cvHenry'), 'henry', t / 1000); }
  if (playing) { if (!isPaused()) update(dt); } else { now += dt; runTasks(); }
  draw(playing ? now : t / 1000);
}
addEventListener('resize', resize);
buildSettingsUI(); fillSettingsUI(); syncModeButtons(); applySeason();
$('musicBtn').setAttribute('aria-pressed', S.music ? 'true' : 'false');
resize();
const boot = () => requestAnimationFrame(frame);
if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('700 30px Andika'), document.fonts.load('700 30px "Silkscreen"')]).catch(() => {}).finally(boot);
else boot();
