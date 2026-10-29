// Sound effects and background music, synthesised with Web Audio.
'use strict';

// ------------------------------------------------------------------ audio
let AC = null, master, musicGain, sfxGain, voiceGain;
function audioInit() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  // iPhones mute Web Audio when the ringer switch is off unless the page asks for 'playback' audio
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older browsers */ }
  const Ctor = window.AudioContext || window.webkitAudioContext; if (!Ctor) return;
  AC = new Ctor();
  master = AC.createGain(); master.gain.value = 0.9; master.connect(AC.destination);
  musicGain = AC.createGain(); musicGain.gain.value = S.music ? 0.06 : 0; musicGain.connect(master);
  sfxGain = AC.createGain(); sfxGain.gain.value = 0.4; sfxGain.connect(master);
  voiceGain = AC.createGain(); voiceGain.gain.value = 1.0; voiceGain.connect(master);
  startMusic(); decodeVoice();
}
function tone(f, d, type = 'square', vol = 0.3, slide = null, at = 0, out = null) {
  if (!AC) return;
  const t0 = AC.currentTime + at, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + d);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g); g.connect(out || sfxGain); o.start(t0); o.stop(t0 + d + 0.02);
}
function noise(d, vol = 0.4, freq = 2000, at = 0) {
  if (!AC) return;
  const t0 = AC.currentTime + at, n = Math.floor(AC.sampleRate * d);
  const buf = AC.createBuffer(1, n, AC.sampleRate), ch = buf.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = AC.createBufferSource(); s.buffer = buf;
  const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = AC.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t0);
}
const midi = m => 440 * Math.pow(2, (m - 69) / 12);
const SFX = {
  jump: () => tone(300, 0.18, 'square', 0.16, 700), land: () => tone(140, 0.12, 'sine', 0.28, 60),
  step: () => tone(rand(180, 220), 0.03, 'triangle', 0.05), pop: () => tone(300, 0.1, 'sine', 0.3, 1300),
  pick: () => [76, 83].forEach((m, i) => tone(midi(m), 0.1, 'triangle', 0.25, null, i * 0.07)),
  good: () => [72, 76, 79, 84].forEach((m, i) => tone(midi(m), 0.16, 'square', 0.12, null, i * 0.08)),
  gem: n => tone(midi(76 + n * 2), 0.14, 'triangle', 0.28, midi(83 + n * 2)),
  wrong: () => { tone(330, 0.14, 'triangle', 0.2, 300); tone(260, 0.2, 'triangle', 0.2, 240, 0.13); },
  ah: k => tone(320 + k * 60, 0.3, 'square', 0.08, 380 + k * 60),
  hmm: k => tone(180 + k * 40, 0.18, 'triangle', 0.14, 220 + k * 40),
  achoo: () => { noise(0.5, 0.6, 3500); noise(0.4, 0.7, 600); tone(110, 0.3, 'sine', 0.35, 45); },
  trump: () => {
    if (!AC) return;
    const t0 = AC.currentTime, d = 0.75;
    const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(105, t0); o.frequency.exponentialRampToValueAtTime(58, t0 + d);
    const lfo = AC.createOscillator(); lfo.frequency.setValueAtTime(26, t0); lfo.frequency.linearRampToValueAtTime(14, t0 + d);
    const lg = AC.createGain(); lg.gain.value = 0.5; const am = AC.createGain(); am.gain.value = 0.5;
    const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 650;
    const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.7, t0 + 0.03); g.gain.setValueAtTime(0.7, t0 + d * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    lfo.connect(lg); lg.connect(am.gain); o.connect(f); f.connect(am); am.connect(g); g.connect(sfxGain);
    o.start(t0); lfo.start(t0); o.stop(t0 + d + 0.05); lfo.stop(t0 + d + 0.05);
    noise(0.35, 0.12, 400, 0.04);
  },
  whee: () => tone(500, 0.6, 'square', 0.06, 1800), nibble: () => { noise(0.05, 0.22, 4000); noise(0.05, 0.18, 4000, 0.09); },
  dig: () => { noise(0.18, 0.3, 900); tone(200, 0.15, 'triangle', 0.15, 500); },
  build: () => tone(rand(500, 800), 0.06, 'square', 0.07),
  steal: () => { tone(600, 0.12, 'square', 0.1, 300); tone(400, 0.2, 'square', 0.1, 200, 0.12); },
  party: () => { [72, 76, 79, 84, 79, 84, 88].forEach((m, i) => tone(midi(m), 0.2, 'square', 0.12, null, i * 0.1)); noise(0.3, 0.25, 6000, 0.7); },
};
const LEAD = [72, 76, 79, 76, 77, 76, 74, 72, 77, 81, 84, 81, 79, 77, 76, 74, 79, 83, 86, 83, 81, 79, 77, 74, 76, 79, 72, 0, 72, 0, 0, 0];
const BASS = [48, 53, 55, 48];
let nextNote = 0, noteIdx = 0;
function startMusic() {
  nextNote = AC.currentTime + 0.1; const E8 = 60 / 116 / 2;
  setInterval(() => {
    while (nextNote < AC.currentTime + 0.25) {
      const at = nextNote - AC.currentTime, m = LEAD[noteIdx % 32];
      if (m) tone(midi(m), E8 * 0.85, 'triangle', 0.45, null, at, musicGain);
      if (noteIdx % 2 === 0) tone(midi(BASS[Math.floor(noteIdx / 8) % 4]), E8 * 1.8, 'sine', 0.9, null, at, musicGain);
      nextNote += E8; noteIdx++;
    }
  }, 60);
}
function musicLevel() { return S.music ? (talking() ? 0.015 : 0.06) : 0; }
function setMusic(on) { S.music = on; saveSettings(); $('musicBtn').setAttribute('aria-pressed', on ? 'true' : 'false'); if (musicGain) musicGain.gain.setTargetAtTime(musicLevel(), AC.currentTime, 0.1); }
